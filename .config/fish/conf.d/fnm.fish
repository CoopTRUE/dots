# fnm
set FNM_PATH "/opt/homebrew/opt/fnm/bin"
if [ -d "$FNM_PATH" ]
  fish_add_path "$FNM_PATH"
  fnm env --use-on-cd --shell fish | source
end
