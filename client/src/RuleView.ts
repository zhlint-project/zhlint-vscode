import * as vscode from 'vscode';
import { ZhlintDiffRule } from './types';

export class RuleNodeProvider implements vscode.TreeDataProvider<RuleNode> {

	private _onDidChangeTreeData: vscode.EventEmitter<RuleNode | undefined | void> = new vscode.EventEmitter<RuleNode | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<RuleNode | undefined | void> = this._onDidChangeTreeData.event;

	private _diffMap = new Map<string, ZhlintDiffRule[]>();
	private activeEditorUri?: string;

	constructor(private context: vscode.ExtensionContext) {
	}

	private createZhlintUri(uri: string, rule: ZhlintDiffRule, left: boolean) {
		return vscode.Uri.parse(`zhlint://diff/${uri}?ruleName=${rule.ruleName}&left=${left}`);
	}

	public register() {
		vscode.window.registerTreeDataProvider('zhlintRules', this);
		vscode.commands.registerCommand('zhlint.openRuleDiff', (diff) => {
			console.log('==> 打开查看', diff);
			// 为啥这里没有监听到？
		});

		// 这里模拟出 自定义协议zhlint:// 用来提供给diff时获取文件
		vscode.workspace.registerTextDocumentContentProvider('zhlint', {
			provideTextDocumentContent: (uri) => {
				// 前面有个"/"去掉
				const activeUri = uri.path.slice(1);
				const query = uri.query;
				// parse query
				// const query = 'ruleName=spaceBetweenHalfWidthLetters&left=true';
				const queryMap = query.split('&').reduce((map, item) => {
					const [key, value] = item.split('=');
					map[key] = value;
					return map;
				}, {} as any);
				const ruleName = queryMap.ruleName;
				const left = queryMap.left === 'true';
				
				console.log('open ', activeUri, query, ruleName, left);
				const diffs = this._diffMap.get(activeUri);
				console.log('find diffs', activeUri, diffs, [...this._diffMap.keys()]);

				if (!diffs) {
					return '';
				}

				const diff = diffs.find(diff => diff.ruleName === ruleName);
				if (!diff) {
					return '';
				}

				if (left) return diff.lastValue;
				return diff.value;
			}
		});

		const tree = vscode.window.createTreeView('zhlintRules', {
			treeDataProvider: this,
			showCollapseAll: true,
		});

		tree.onDidChangeSelection(e => {
			console.log('click', e);
			const diff = e.selection[0];
			vscode.commands.executeCommand(
				'vscode.diff',
				this.createZhlintUri(this.activeEditorUri || '', diff.diff, true),
				this.createZhlintUri(this.activeEditorUri || '', diff.diff, false),
				`parse: ${diff.diff.ruleName}`
			);
		});

		this.context.subscriptions.push(tree);
	}

	saveNewDiff(uri: string, diff?: ZhlintDiffRule[]) {
		if (diff) {
			this._diffMap.set(uri, diff);
			this.refresh();
		} else {
			this.deleteNewDiff(uri);
		}
	}

	deleteNewDiff(uri: string) {
		this._diffMap.delete(uri);
		this.refresh();
	}

	changeActiveEditor(uri: string) {
		this.activeEditorUri = uri;
		this.refresh();
	}

	clearAllDiff() {
		this._diffMap.clear();
		this.refresh();
	}

	refresh(rule?: RuleNode): void {
		this._onDidChangeTreeData.fire(rule);
	}

	getTreeItem(element: RuleNode): vscode.TreeItem {
		return element;
	}

	getChildren(element?: RuleNode): Thenable<RuleNode[]> {
		const rules = this.getRules();
		return Promise.resolve(rules);
	}

	private getRules(): RuleNode[] {
		const diffs = this._diffMap.get(this.activeEditorUri || '');
		if (diffs) {
			return diffs.map((diff, index) => {
				return new RuleNode(diff);
			});
		}
		return [];
	}
}

export class RuleNode extends vscode.TreeItem {
	constructor(
		public readonly diff: ZhlintDiffRule,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None,
	) {
		super(getLabel(diff), collapsibleState);
		this.diff = diff;
		this.iconPath = getIcon(diff);
	}
}

function getLabel(diff: ZhlintDiffRule) {
	return diff.ruleName;
}

function getIcon(diff: ZhlintDiffRule) {
	return new vscode.ThemeIcon(diff.changed ? 'check' : 'close');
}
