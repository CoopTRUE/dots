
set -U fish_greeting ""

# Syntax highlighting colors
set -g fish_color_command blue
set -g fish_color_valid_path --underline

set --export BUN_INSTALL "$HOME/.bun"
set --export PATH $BUN_INSTALL/bin $PATH

# MySQL and PostgreSQL
fish_add_path /opt/homebrew/opt/mysql-client/bin
fish_add_path /opt/homebrew/opt/postgresql@17/bin
set -gx LDFLAGS "-L/opt/homebrew/opt/mysql-client/lib -L/opt/homebrew/opt/postgresql@17/lib"
set -gx CPPFLAGS "-I/opt/homebrew/opt/mysql-client/include -I/opt/homebrew/opt/postgresql@17/include"

test -f ~/.config/fish/aliases.local.fish && source ~/.config/fish/aliases.local.fish
source ~/.config/fish/aliases.fish


# Don't save cldi commands to history
function fish_should_add_to_history
    string match -qr '^cldi( |$)' -- $argv[1]
    and return 1
    return 0
end

starship init fish | source
if status is-interactive
    fastfetch
end