# User Preferences

## Git Commit Messages

Write short, concise commit messages in imperative mood. One line only, no body unless explicitly asked. Focus on what the change does, not why.

Examples of good messages:
- "Add error handling to applyToCollection field provider"
- "Prefer IDE diagnostics over yarn tsc for typechecking"
- "Add discountType field provider for Shopify discount action"
- "Added max discounts per chat"

Keep them under ~70 characters when possible. Sentence case, no trailing period.

## Pull Request Descriptions

When mentioning that a PR stacks on top of another PR, reference it by PR number (e.g., `#123`) rather than branch name.

## Dotfiles

Dotfiles are managed with a bare git repo at `$HOME/.cfg/` with the work tree set to `$HOME`. The `dots` alias wraps git for this: `dots` is equivalent to `git --git-dir=$HOME/.cfg/ --work-tree=$HOME`. Use `dots` instead of `git` when working with dotfiles (e.g., `dots add`, `dots commit`, `dots push`). The `dotsupdate` alias runs `dots commit -a -m "Update dots"` as a quick commit shortcut.

Key dotfile locations:
- Fish config: `~/.config/fish/config.fish`
- Fish aliases: `~/.config/fish/aliases.fish`
- Machine-local aliases: `~/.config/fish/aliases.local.fish`
- Starship prompt: `~/.config/starship.toml`
