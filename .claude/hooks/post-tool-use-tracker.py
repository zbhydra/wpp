#!/usr/bin/env python3
"""PostToolUse Hook - Track edited files for code quality checking."""

import os
import sys
from pathlib import Path

# Environment variables provided by Claude Code
TOOL_NAME = os.environ.get("CLAUDE_TOOL_NAME", "")
FILE_PATH = os.environ.get("CLAUDE_FILE_PATH", "")
PROJECT_DIR = os.environ.get("CLAUDE_PROJECT_DIR", "")

# Skip tracking if disabled
if os.environ.get("SKIP_TRACK_EDITS") == "true":
    sys.exit(0)

# Only track Edit and Write operations
if TOOL_NAME not in ("Edit", "Write"):
    sys.exit(0)

# File path is required
if not FILE_PATH:
    sys.exit(0)

# Resolve absolute path
if not Path(FILE_PATH).is_absolute():
    file_path = Path(PROJECT_DIR) / FILE_PATH
else:
    file_path = Path(FILE_PATH)

# Track file - only if it exists
if file_path.is_file():
    track_file = Path(PROJECT_DIR) / "tests" / "logs" / ".claude_edited_files.txt"
    track_file.parent.mkdir(parents=True, exist_ok=True)

    # Read existing tracked files
    tracked = set()
    if track_file.exists():
        tracked = {line.strip() for line in track_file.read_text().splitlines()}

    # Add current file if not already tracked
    file_str = str(file_path)
    if file_str not in tracked:
        tracked.add(file_str)
        track_file.write_text("\n".join(sorted(tracked)) + "\n")

sys.exit(0)
