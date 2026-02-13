alias code="cursor"

alias ls="lsd --group-directories-first"
alias fsize="ls -l --blocks=size,name --tree --depth 1"
alias cat="bat --paging=never"
alias find="fd"

alias fbtoken='NODE_ENV=development firebase-emu-token -e $FB_EMU_EMAIL -p $FB_EMU_PASSWORD | pbcopy'

alias fishedit="code ~/.config/fish/config.fish -r"
alias afishedit="code ~/.config/fish/aliases.fish -r"
alias staredit="code ~/.config/starship.toml -r"
alias fastedit="code ~/.config/fastfetch/config.jsonc -r"

alias reload="exec fish"

function planetscale-command
    node ~/.config/scripts/planetscale-branch.mjs $argv
end

function cld
    claude --allow-dangerously-skip-permissions $argv
end

# Incognito Claude - runs claude without saving session history
function cldi
    bash ~/.config/scripts/incognito_claude.sh $argv
end

alias psdr="planetscale-command --deploy"
alias pspush="planetscale-command"

alias grd="git rebase origin/dev"

alias dots='/usr/bin/git --git-dir=$HOME/.cfg/ --work-tree=$HOME'