import { assertEqualAfterFix } from './helper';
import * as vscode from 'vscode';

suite('formatter should work', () => {
	test('formatting work', async () => {
		const names = [
			'example-units',
			'example-vuepress'
		]; 

		for (const name of names) {
			await assertEqualAfterFix(name);
		}
	});

	test('formatting range work', async() => {
		const lists = [
			{
				name: 'example-units-select',
				selections: [
					new vscode.Selection(0, 0, 5, 61),
					new vscode.Selection(18, 0, 20, 27)
				]
			},
			{
				name: 'example-vuepress-select',
				selections: [
					new vscode.Selection(1, 0, 1, 15)
				]
			}
		];

		for (const item of lists) {
			await assertEqualAfterFix(item.name, item.selections);
		}

	});
});