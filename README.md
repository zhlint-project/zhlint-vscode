# Awesome zhlint

<a href="https://marketplace.visualstudio.com/items?itemName=kkopite.zhlint" target="__blank"><img src="https://img.shields.io/visual-studio-marketplace/v/antfu.ext-name.svg?color=eee&amp;label=VS%20Code%20Marketplace&logo=visual-studio-code" alt="Visual Studio Marketplace Version" /></a>

A VS Code Extension for [zhlint](https://zhlint-project.github.io/zhlint/#supported-rules)

## Feature

- lint
- format

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

## zhlint options

```json
{
	"zhlint.rules": {},
	"zhlint.ignoredCases": {},
	"zhlint.hyperParses": {}
}
```

more detail, you can look the [zhlint document](https://zhlint-project.github.io/zhlint)


## Dev

- Run `npm install` in this folder. This installs all necessary npm modules in both the client and server folder
- Open VS Code on this folder.
- Press Ctrl+Shift+B to start compiling the client and server in [watch mode](https://code.visualstudio.com/docs/editor/tasks#:~:text=The%20first%20entry%20executes,the%20HelloWorld.js%20file.).
- Switch to the Run and Debug View in the Sidebar (Ctrl+Shift+D).
- Select `Launch Client` from the drop down (if it is not already).
- Press ▷ to run the launch config (F5).