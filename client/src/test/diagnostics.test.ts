/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';
import * as assert from 'assert';
import { getDocUri, activate } from './helper';
import { readFile } from 'fs/promises';

suite('Should get diagnostics', () => {

	const names = [
		'example-units',
		'example-vuepress'
	];

	test('Diagnoses works', async () => {

		for (const name of names) {
			const docUri = getDocUri(`${name}.md`);
			const expectDocUri = getDocUri(`${name}-expected.json`);
			await testDiagnostics(docUri, expectDocUri);
		}
	});

	test('should get empty diagnostics with disabled', async () => {
		const docUri = getDocUri('example-disabled.md');
		await activate(docUri);
		const diagnostics = vscode.languages.getDiagnostics(docUri);
		assert.equal(diagnostics.length, 0);
	});
});

function toDiagnostic(message: string, target: string, range: [number, number, number, number]) {
	return {
		message,
		range: toRange(...range),
		severity: vscode.DiagnosticSeverity.Warning,
		source: 'zhlint',
		code: target,
		codeDescription: {
			href: 'https://zhlint-project.github.io/zhlint/#supported-rules',
		},
	};
}

function toRange(sLine: number, sChar: number, eLine: number, eChar: number) {
	const start = new vscode.Position(sLine, sChar);
	const end = new vscode.Position(eLine, eChar);
	return new vscode.Range(start, end);
}

async function testDiagnostics(docUri: vscode.Uri, exceptUri: vscode.Uri) {
	await activate(docUri);

	const expectedDiagnostics = JSON.parse(await readFile(exceptUri.fsPath, 'utf8')).map((d: any) => toDiagnostic(d.message, d.target, d.range));

	const actualDiagnostics = vscode.languages.getDiagnostics(docUri);

	assert.equal(actualDiagnostics.length, expectedDiagnostics.length);

	expectedDiagnostics.forEach((expectedDiagnostic, i) => {
		const actualDiagnostic = actualDiagnostics[i];
		assert.equal(actualDiagnostic.message, expectedDiagnostic.message);
		assert.deepEqual(actualDiagnostic.range, expectedDiagnostic.range);
		assert.equal(actualDiagnostic.severity, expectedDiagnostic.severity);
	});
}