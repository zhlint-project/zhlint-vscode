# VS Code zhlint Extension

<a href="https://marketplace.visualstudio.com/items?itemName=kkopite.zhlint" target="__blank"><img src="https://img.shields.io/visual-studio-marketplace/v/kkopite.zhlint.svg?color=ed5d47&amp;label=VS%20Code%20Marketplace&logo=visual-studio-code" alt="Visual Studio Marketplace Version" /></a>


VS Code Extension for [zhlint](https://zhlint-project.github.io/zhlint/#supported-rules)

## Feature

- lint
- format
- support `.zhlintr{c, c.json}` and `.zhlintignore` (**if one of them exist，this extension will use `readRc` and `runWithConfig`，otherwise use `run()` with `zhlint.options` from `settings.json`**)

use `zhlint` as your default formatter for markdown

```json
{
  "[markdown]": {
    "editor.defaultFormatter": "kkopite.zhlint",
    "editor.formatOnSave": true
  }
}
```

you can use `Shift + Alt + F` or save to format your markdown with `zhlint`

Currently，only `.md` files are supported。If you want to support other file types，such as `.txt`

```json
{
  "files.associations": {
    "*.txt": "markdown",
  }
}
```

## options

|`key`|`description`|
|:---:|:-----------:|
|`options`|see [zhlint options](https://zhlint-project.github.io/zhlint/#options),  `logger` is exclude  |
|`debug`|print extra message when run zhlint|

## Dev

- Run `npm install` in this folder。This installs all necessary npm modules in both the client and server folder
- Open VS Code on this folder。
- Press Ctrl+Shift+B to start compiling the client and server in [watch mode](https://code.visualstudio.com/docs/editor/tasks#:~:text=The%20first%20entry%20executes,the%20HelloWorld.js%20file.)。
- Switch to the Run and Debug View in the Sidebar (Ctrl+Shift+D)。
- Select `Launch Client` from the drop down (if it is not already)。
- Press ▷ to run the launch config (F5)。
- Select `Attach to Server` from the drop down，press F5 to attach the debugger to the server