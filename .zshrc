export GPG_TTY=$(tty)
gpgconf --launch gpg-agent

alias dots='/usr/bin/git --git-dir=$HOME/.cfg/ --work-tree=$HOME'
