/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import * as vscode from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient/node';
import { RuleNodeProvider } from './RuleView';

let client: LanguageClient;

export function activate(context: vscode.ExtensionContext) {
	// The server is implemented in node
	const serverModule = context.asAbsolutePath(
		path.join('server', 'out', 'server.js')
	);

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	const serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: {
				execArgv: ['--nolazy', '--inspect=6009']
			}
		}
	};

	// Options to control the language client
	const clientOptions: LanguageClientOptions = {
		// Register the server for plain text documents
		documentSelector: [{ scheme: 'file', language: 'markdown' }],
		diagnosticCollectionName: 'zhlint',
		synchronize: {
			fileEvents: [
				vscode.workspace.createFileSystemWatcher('**/.zhlintr{c,c.json}'),
				vscode.workspace.createFileSystemWatcher('**/.zhlintignore'),
			]
		}
	};

	// Create the language client and start the client.
	client = new LanguageClient(
		'zhlint',
		'zhlint',
		serverOptions,
		clientOptions
	);

	// Start the client. This will also launch the server
	client.start();

	const ruleProvider = new RuleNodeProvider(context);
	ruleProvider.register();

	client.onNotification('zhlint/rules', (params) => {
		const uri = decodeURIComponent(params.uri);
		// 存起来
		ruleProvider.saveNewDiff(uri, params.diff);

		// TODO: 如何监听activeEditor变化
		ruleProvider.changeActiveEditor(uri);
	});

	client.onNotification('zhlint/clearRules', (params) => {
		const uri = decodeURIComponent(params.uri);
		ruleProvider.deleteNewDiff(uri);
	});


}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
