/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import { resolve } from 'node:path'
import { existsSync } from 'node:fs'
import type {
  Diagnostic,
  InitializeParams,
  InitializeResult,
  TextDocumentIdentifier,
} from 'vscode-languageserver/node'
import {
  DiagnosticSeverity,
  DidChangeConfigurationNotification,
  ProposedFeatures,
  Range,
  TextDocumentSyncKind,
  TextDocuments,
  createConnection,
} from 'vscode-languageserver/node'

import {
  TextDocument,
} from 'vscode-languageserver-textdocument'

import type { Options } from 'zhlint'
import { readRc, run, runWithConfig } from 'zhlint'
import { defaultConfigFilename, defaultIgnoreFilename } from './constants'
import FileFilter from './FileFilter'

type Config = ReturnType<typeof readRc>

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all)

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument)

let hasConfigurationCapability = false
let hasWorkspaceFolderCapability = false
let _hasDiagnosticRelatedInformationCapability = false

let localZhlintConfig: Config | null = null

const fileFilter = new FileFilter()

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities

  // Does the client support the `workspace/configuration` request?
  // If not, we fall back using global settings.
  hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
  )
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  )
  _hasDiagnosticRelatedInformationCapability = !!(
    capabilities.textDocument
    && capabilities.textDocument.publishDiagnostics
    && capabilities.textDocument.publishDiagnostics.relatedInformation
  )

  const result: InitializeResult = {
    capabilities: {
      // 这一个是必须的，不然CodeActionProvider不会生效
      // 暂时不用quickfix, 因为修复是针对全局的，而不是局部的，局部修复并不知道具体的字符
      // codeActionProvider: true,
      textDocumentSync: TextDocumentSyncKind.Incremental,
      documentFormattingProvider: true,
      documentRangeFormattingProvider: true,
    },
  }
  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true,
      },
    }
  }
  return result
})

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    connection.client.register(DidChangeConfigurationNotification.type, undefined)
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      connection.console.log('Workspace folder change event received.')
    })
  }
})

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ZhlintSettings = {
  options: {
    rules: {
      preset: 'default',
    },
  },
  debug: false,
  enable: true,
  experimental: {
    diff: false,
    config: false,
    ignore: false,
  },
}

interface ZhlintSettings {
  options: Options
  debug: boolean
  enable: boolean
  experimental: {
    diff: boolean
    config: boolean
    ignore: boolean
  }
}
let globalSettings: ZhlintSettings = defaultSettings

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<ZhlintSettings>> = new Map()

connection.onDidChangeConfiguration((change) => {
  if (hasConfigurationCapability) {
    // Reset all cached document settings
    documentSettings.clear()
  }
  else {
    globalSettings = <ZhlintSettings>(
			(change.settings.zhlint || defaultSettings)
		)
  }

  // Revalidate all open text documents
  documents.all().forEach(validateTextDocument)
})

function checkZhlintConfig(_textDocument: TextDocument) {
  const dir = resolve('.')

  const result: {
    config?: string
    ignore?: string
  } = {}

  result.config = defaultConfigFilename.find((filename) => {
    return existsSync(resolve(dir, filename))
  })
  const ignore = resolve(dir, defaultIgnoreFilename)
  if (existsSync(ignore))
    result.ignore = defaultIgnoreFilename

  return result
}

function getZhlintConfig(textDocument: TextDocument, options: ZhlintSettings): { type: 'option', options: Options } | { type: 'config', config: Config } {
  const result = checkZhlintConfig(textDocument)

  if (options.experimental.config && (result.config || result.ignore)) {
    if (!localZhlintConfig)
      localZhlintConfig = readRc('.', result.config || defaultConfigFilename[0], result.ignore || defaultIgnoreFilename, console)

    return {
      type: 'config',
      config: localZhlintConfig,
    }
  }

  return {
    type: 'option',
    options: options.options,
  }
}

async function getDocumentSettings(textDocument: TextDocument): Promise<ZhlintSettings> {
  if (!hasConfigurationCapability)
    return globalSettings

  const resource = textDocument.uri
  let result = documentSettings.get(resource)
  if (!result) {
    result = connection.workspace.getConfiguration({
      scopeUri: resource,
      section: 'zhlint',
    })
    documentSettings.set(resource, result)
  }
  return result
}

// Only keep settings for open documents
documents.onDidClose((e) => {
  documentSettings.delete(e.document.uri)
  connection.sendNotification('zhlint/clearRules', {
    uri: e.document.uri,
  })
})

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
  validateTextDocument(change.document)
})

async function lintMD(textDocument: TextDocument, range?: Range) {
  const uri = textDocument.uri

  const settings = await getDocumentSettings(textDocument)
  if (!settings.enable)
    return
  if (settings.experimental.ignore && fileFilter.ignores(uri))
    return

  const res = getZhlintConfig(textDocument, settings)
  if (settings.debug)
    console.log('get zhlint config', res, settings)

  const text = textDocument.getText(range)
  try {
    // zhlint use globalThis.__DEV__ to control debug mode
    globalThis.__DEV__ = settings.debug
    globalThis.__DIFF__ = settings.experimental.diff
    const output = res.type === 'option' ? run(text, res.options) : runWithConfig(text, res.config)
    return output
  }
  catch (error) {
    if (!settings.debug)
      return
    console.log(`resolve ${textDocument.uri} failed`)
    console.log('-----------------------------')
    console.log('original text:')
    console.log('')
    console.log(textDocument.getText(range))
    console.log('')
    console.log('-----------------------------')
    console.error(error)
  }
}

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  const output = await lintMD(textDocument)
  if (!output) {
    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: [] })
    connection.sendNotification('zhlint/clearRules', {
      uri: textDocument.uri,
    })
    return
  }
  const diagnostics = output.validations.map((validation) => {
    const start = textDocument.positionAt(validation.index)
    const end = textDocument.positionAt(validation.index + validation.length)
    const range = {
      start,
      end,
    }

    const diagnostic: Diagnostic = {
      severity: DiagnosticSeverity.Warning,
      message: validation.message,
      source: 'zhlint',
      code: validation.target,
      codeDescription: {
        href: 'https://zhlint-project.github.io/zhlint/#supported-rules',
      },
      range,
    }

    return diagnostic
  })
  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics })
  connection.sendNotification('zhlint/rules', {
    diff: output.diff,
    origin: output.origin,
    result: output.result,
    uri: textDocument.uri,
  })
}

async function formatDocument(identifier: TextDocumentIdentifier, range?: Range) {
  const textDocument = documents.get(identifier.uri)
  if (textDocument) {
    if (!range)
      range = Range.create(0, 0, textDocument.lineCount, 0)

    const output = await lintMD(textDocument, range)
    if (output) {
      return [
        {
          range,
          newText: output.result,
        },
      ]
    }
  }
}

connection.onDocumentFormatting(async (params) => {
  return formatDocument(params.textDocument)
})

connection.onDocumentRangeFormatting(async (params) => {
  return formatDocument(params.textDocument, params.range)
})

// watch zhlintrc and zhlintignore
connection.onDidChangeWatchedFiles(async (params) => {
  localZhlintConfig = null
  fileFilter.reload(params)
  documents.all().forEach(validateTextDocument)
})

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection)

// Listen on the connection
connection.listen()
