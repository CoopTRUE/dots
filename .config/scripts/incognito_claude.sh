#!/bin/bash

# Run claude and capture both the message and session ID
all_args="$@"
OUTPUT=$(claude --dangerously-skip-permissions -p "$all_args" --output-format json)

# Extract the commit message and session ID
# Claude outputs different schemas depending on whether "verbose" output is on. 
# Try basic format (simple dict) first, fall back to "verbose" format (array of dicts with type=="result")
RESULT=$(echo "$OUTPUT" | jq -r '.result // empty' 2>/dev/null)
if [[ -z "$RESULT" ]]; then
    RESULT=$(echo "$OUTPUT" | jq -r '.[] | select(.type == "result") | .result')
fi

SESSION_ID=$(echo "$OUTPUT" | jq -r '.session_id // empty' 2>/dev/null)
if [[ -z "$SESSION_ID" ]]; then
    SESSION_ID=$(echo "$OUTPUT" | jq -r '.[] | select(.type == "result") | .session_id')
fi

# Clean up session files so it doesn't appear in /resume
if [[ -n "$SESSION_ID" ]]; then
    rm -f ~/.claude/projects/*/"$SESSION_ID".jsonl 2>/dev/null
    rm -f ~/.claude/todos/"$SESSION_ID"-*.json 2>/dev/null
    rm -f ~/.claude/debug/"$SESSION_ID".txt 2>/dev/null
fi

echo "$RESULT"
