/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
	createConnection,
	TextDocuments,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	TextDocumentSyncKind,
	InitializeResult,
	Range,
	TextDocumentIdentifier,
} from 'vscode-languageserver/node';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';

import { run, Options, Result } from 'zhlint';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
	const capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we fall back using global settings.
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);
	hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);

	const result: InitializeResult = {
		capabilities: {
			// 这一个是必须的，不然CodeActionProvider不会生效
			// 暂时不用quickfix, 因为修复是针对全局的，而不是局部的，局部修复并不知道具体的字符
			// codeActionProvider: true,
			textDocumentSync: TextDocumentSyncKind.Incremental,
			documentFormattingProvider: true,
			documentRangeFormattingProvider: true
		}
	};
	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		};
	}
	return result;
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ZhlintSettings = {
	options: {
		rules: {
			preset: 'default'
		}
	},
	debug: false
};

interface ZhlintSettings {
	options: Options;
	debug: boolean;
}
let globalSettings: ZhlintSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<ZhlintSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = <ZhlintSettings>(
			(change.settings.zhlint || defaultSettings)
		);
	}

	// Revalidate all open text documents
	documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<ZhlintSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'zhlint'
		});
		documentSettings.set(resource, result);
	}
	return result;
}

// Only keep settings for open documents
documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
	validateTextDocument(change.document);
});

async function lintMD(textDocument: TextDocument, range?: Range) {
	const settings = await getDocumentSettings(textDocument.uri);
	const text = textDocument.getText(range);
	try {
		const options: Options = {
			...settings.options,
			logger: console	
		};
		// FIXME: how to add expand globalThis with __DEV__ so that we do not need to set `"noImplicitAny": false` in tsconfig.json
		// zhlint use globalThis.__DEV__ to control debug mode
		globalThis.__DEV__ = settings.debug;
		const output = run(text, settings.options || {});
		return output;
	} catch (error) {
		if (!settings.debug) return;
		console.log(`resolve ${textDocument.uri} failed`);
		console.log('-----------------------------');
		console.log('original text:');
		console.log('');
		console.log(textDocument.getText(range));
		console.log('');
		console.log('-----------------------------');
		console.error(error);			
	}
}

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
		const output = await lintMD(textDocument);
		if (!output) return;
		const diagnostics = output.validations.map((validation) => {

			const start = textDocument.positionAt(validation.index);
			const end = textDocument.positionAt(validation.index + validation.length);
			const range = {
				start,
				end
			};

			const diagnostic: Diagnostic = {
				severity: DiagnosticSeverity.Warning,
				message: validation.message,
				source: 'zhlint',
				code: validation.target,
				codeDescription: {
					href: 'https://zhlint-project.github.io/zhlint/#supported-rules',
				},
				range,
			};

			return diagnostic;
		});
		connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

async function formatDocument(identifier: TextDocumentIdentifier, range?: Range) {
	const textDocument = documents.get(identifier.uri);
	if (textDocument) {
		if (!range) {
			range = Range.create(0, 0, textDocument.lineCount, 0);
		}
		
		const output = await lintMD(textDocument, range);
		if (output) {
			return [
				{
					range,
					newText: output.result
				}
			];
		}
	}
}

connection.onDocumentFormatting(async (params) => {
	return formatDocument(params.textDocument);
});

connection.onDocumentRangeFormatting(async (params) => {
	return formatDocument(params.textDocument, params.range);
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
