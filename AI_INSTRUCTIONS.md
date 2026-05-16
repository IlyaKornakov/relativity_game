# AI Assistant Instructions

This file contains critical instructions for any AI assistant working in this repository.

## Rule 1: Never Leave Running Instances
**CRITICAL**: You must NEVER leave background processes (like `npm run dev`, Vite, Node, or Python servers) running after you finish your task.

If you start a server to test functionality using a background command or browser subagent:
1. You MUST explicitly terminate the command ID.
2. You MUST run a cleanup command (e.g., `pkill -f vite; pkill -f node`) before concluding your turn to guarantee that the user is not left with zombie processes hoarding ports. 

The user should only ever run servers manually (e.g. via `./run.sh`).
