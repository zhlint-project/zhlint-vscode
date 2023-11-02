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
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	InitializeResult,
	CodeAction,
	CodeActionKind,
	CodeActionParams
} from 'vscode-languageserver/node';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';
import { run } from 'zhlint';

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
			// Tell the client that this server supports code completion.
			completionProvider: {
				resolveProvider: true
			}
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

// The example settings
interface ExampleSettings {
	maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = <ExampleSettings>(
			(change.settings.languageServerExample || defaultSettings)
		);
	}

	// Revalidate all open text documents
	documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
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

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
	// In this simple example we get the settings for every validate run.
	const settings = await getDocumentSettings(textDocument.uri);

	// The validator creates diagnostics for all uppercase words length 2 and more
	const text = textDocument.getText();
	let m: RegExpExecArray | null;

	const options = {
		rules: {
			preset: 'default'
		}
	};
	const output = run(text, options);

	const diagnostics = output.validations.map((validation) => {

		const start = textDocument.positionAt(validation.index);
		// 多加1，这样局部lint的时候才会有效果，如：English和，加1的话范围到和，这样局部也能做处理
		const end = textDocument.positionAt(validation.index + validation.length + 1);
		const range = {
			start,
			end
		};

		const origin = textDocument.getText(range);
		// TODO: 这样其实是跑了两遍，如何优化？
		const result = run(origin, options).result;

		const diagnostic: Diagnostic = {
			severity: DiagnosticSeverity.Warning,
			message: validation.message,
			source: 'zhlint',
			code: validation.target,
			codeDescription: {
				href: 'https://zhlint-project.github.io/zhlint/#supported-rules',
			},
			range,
			data: {
				origin,
				result
			},
		};

		// if (hasDiagnosticRelatedInformationCapability) {
		// 	diagnostic.relatedInformation = [
		// 		{
		// 			location: {
		// 				uri: textDocument.uri,
		// 				range: Object.assign({}, diagnostic.range)
		// 			},
		// 			message: validation.message
		// 		}
		// 	];
		// }

		return diagnostic;
	});
	// Send the computed diagnostics to VSCode.
	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

function quickfix(_: TextDocument, params: CodeActionParams): CodeAction[] {
	const diagnostics = params.context.diagnostics;
	return diagnostics.map(diag => {
		const action: CodeAction = {
			title: 'zhlint: fix',
			kind: CodeActionKind.QuickFix,
			diagnostics: [diag],
			edit: {
				changes: {
					[params.textDocument.uri]: [
						{
							range: diag.range,
							newText: diag.data.result
						}
					]
				}
			},
			isPreferred: true
		};
		return action;
	});
}

connection.onCodeAction((params) => {
	if (!params.context.diagnostics || params.context.diagnostics.length === 0) return [];
	const document = documents.get(params.textDocument.uri);
	if (!document) return [];
	return quickfix(document, params);
});

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});


// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
