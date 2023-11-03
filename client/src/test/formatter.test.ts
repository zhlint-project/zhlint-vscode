import { readFile } from 'fs/promises';
import { activate, getDocUri } from './helper';
import * as vscode from 'vscode';
import * as assert from 'assert';

suite('formatter should work', () => {
	test('formatting work', async () => {
		const names = [
			'example-units',
			'example-vuepress'
		]; 

		for (const name of names) {
			const docUri = getDocUri(`${name}.md`);
			const fixDocUri = getDocUri(`${name}-fixed.md`);
			const { doc } = await activate(docUri);

			const fixed = await readFile(fixDocUri.fsPath, 'utf8');

			// format docUri
			await vscode.commands.executeCommand('editor.action.formatDocument');	
			const actual = doc.getText();

			assert.equal(actual, fixed);
		}
	});

	// FIXME: test format selection not work, still format whole text
	// test('formatting range work', async() => {
	// 	const lists = [
	// 		{
	// 			name: 'example-units',
	// 			selections: [
	// 				new vscode.Selection(0, 0, 5, 61),
	// 				new vscode.Selection(18, 0, 20, 27)
	// 			]
	// 		},
	// 		{
	// 			name: 'example-vuepress',
	// 			selections: [
	// 				new vscode.Selection(1, 0, 1, 15)
	// 			]
	// 		}
	// 	];

	// 	for (const item of lists) {
	// 		const {
	// 			name,
	// 			selections	
	// 		} = item;

	// 		const {
	// 			doc,
	// 			editor,
	// 		} = await activate(getDocUri(`${name}.md`));

	// 		const fixed = await readFile(getDocUri(`${name}-select-fixed.md`).fsPath, 'utf8');

	// 		editor.selections = selections;
	// 		await vscode.commands.executeCommand('editor.action.formatSelection');
	// 		const actual = doc.getText();
	// 		assert.equal(actual, fixed);
	// 	}

	// });
	
});