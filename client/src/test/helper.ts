/* eslint-disable import/no-mutable-exports */
/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'node:path'
import { readFile } from 'node:fs/promises'
import * as assert from 'node:assert'
import * as vscode from 'vscode'

export let doc: vscode.TextDocument
export let editor: vscode.TextEditor
export let documentEol: string
export let platformEol: string

/**
 * Activates the vscode.lsp-sample extension
 */
export async function activate(docUri: vscode.Uri) {
  // The extensionId is `publisher.name` from package.json
  const ext = vscode.extensions.getExtension('kkopite.zhlint')!
  await ext.activate()
  try {
    doc = await vscode.workspace.openTextDocument(docUri)
    editor = await vscode.window.showTextDocument(doc)
    await sleep(2000) // Wait for server activation
  }
  catch (e) {
    console.error(e)
  }
  return {
    doc,
    editor,
  }
}

export async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function getDocPath(p: string) {
  return path.resolve(__dirname, '../../testFixture', p)
}
export function getDocUri(p: string) {
  return vscode.Uri.file(getDocPath(p))
}

export async function setTestContent(content: string): Promise<boolean> {
  const all = new vscode.Range(
    doc.positionAt(0),
    doc.positionAt(doc.getText().length),
  )
  return editor.edit(eb => eb.replace(all, content))
}

export async function assertEqualAfterFix(name: string, selections?: vscode.Selection[]) {
  const docUri = getDocUri(`${name}.md`)
  const fixDocUri = getDocUri(`${name}-fixed.md`)
  const { doc, editor } = await activate(docUri)
  const fixed = await readFile(fixDocUri.fsPath, 'utf8')

  // format docUri
  if (selections) {
    editor.selections = selections
    await vscode.commands.executeCommand('editor.action.formatSelection')
  }
  else {
    await vscode.commands.executeCommand('editor.action.formatDocument')
  }
  const actual = doc.getText()

  assert.equal(actual, fixed)
}
