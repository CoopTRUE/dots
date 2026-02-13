# Dotfiles

My personal dotfiles, managed using a bare Git repository.

## How It Works

This setup uses a bare Git repository stored in `~/.cfg` with the working tree set to `$HOME`. This allows tracking dotfiles directly in the home directory without symlinking or additional tools.

The key is a `dots` alias that wraps git commands:

```bash
alias dots='/usr/bin/git --git-dir=$HOME/.cfg/ --work-tree=$HOME'
```

This lets you run git commands like `dots status`, `dots add`, `dots commit`, etc. to manage your dotfiles.

## What's Tracked

- `.zshrc`, `.zshenv`, `.zprofile`, `.profile` — Shell configs
- `.config/fish/` — Fish shell init, aliases, conf.d
- `.gitconfig`, `.config/git/ignore` — Git identity + global ignore
- `.ssh/config` — SSH host config
- `.gnupg/gpg.conf`, `.gnupg/gpg-agent.conf` — GPG signing
- `.config/zed/` — Editor settings + keybindings
- `Library/Application Support/com.mitchellh.ghostty/config` — Terminal
- `.config/starship.toml` — Prompt
- `.config/fastfetch/config.jsonc` — System info display
- `.config/karabiner/karabiner.json` — Keyboard remapping
- `.config/scripts/` — Custom scripts
- `.claude/` — Claude Code preferences
- `Brewfile` — Homebrew packages + casks

## Setting Up on a New Machine

### 1. Clone the Repository

```bash
git clone --bare <repo-url> $HOME/.cfg
```

### 2. Define the Alias

```bash
alias dots='/usr/bin/git --git-dir=$HOME/.cfg/ --work-tree=$HOME'
```

### 3. Checkout the Files

```bash
dots checkout
```

If you get errors about existing files that would be overwritten:

```bash
mkdir -p .dots-backup
dots checkout 2>&1 | grep -E "^\s+\." | awk {'print $1'} | xargs -I{} mv {} .dots-backup/{}

dots checkout
```

### 4. Configure the Repository

Hide untracked files (so `dots status` only shows tracked files):

```bash
dots config --local status.showUntrackedFiles no
```

### 5. Add the Alias Permanently

The alias is already in `.zshrc` and `.config/fish/aliases.fish`, so it will be available after checkout.

### 6. Install Homebrew Packages

```bash
brew bundle --file=~/Brewfile
```

## Usage

Once set up, use the `dots` alias just like git:

```bash
dots status
dots add ~/.some-config-file
dots commit -m "Add some-config-file"
dots push
dots pull
```

## References

- [Atlassian: How to Store Dotfiles](https://www.atlassian.com/git/tutorials/dotfiles)
