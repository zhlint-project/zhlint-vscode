import * as vscode from 'vscode'
import { it } from 'mocha'
import { assertEqualAfterFix } from './helper'

suite('formatter should work', () => {
  it('formatting work', async () => {
    const names = [
      'example-units',
      'example-vuepress',
    ]

    for (const name of names)
      await assertEqualAfterFix(name)
  })

  it('formatting range work', async () => {
    const lists = [
      {
        name: 'example-units-select',
        selections: [
          new vscode.Selection(0, 0, 5, 61),
          new vscode.Selection(18, 0, 20, 27),
        ],
      },
      {
        name: 'example-vuepress-select',
        selections: [
          new vscode.Selection(1, 0, 1, 15),
        ],
      },
    ]

    for (const item of lists)
      await assertEqualAfterFix(item.name, item.selections)
  })
})
