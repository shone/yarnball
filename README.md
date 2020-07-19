![Yarnball Logo](images/icon.svg)

# Yarnball

A semantic network editor, intended to be used like a text editor for code and markup.

Running live at:

[shone.dev/yarnball](https://shone.dev/yarnball/)

## Desktop Integration

- Copy `desktop_integration/yarnball.desktop` to `~/.local/share/applications/`
- Copy `desktop_integration/application-yarnball.xml` to `~/.local/share/mime/packages/`

```bash
$ update-mime-database ~/.local/share/mime
$ xdg-mime default yarnball.desktop application/yarnball
```
