#!/usr/bin/env python3
"""Stop Hook - Code quality checker.

Runs linting, formatting, and type checking on edited files.
"""

import os
import subprocess
import sys
from pathlib import Path

# Colors
RED = "\033[0;31m"
GREEN = "\033[0;32m"
YELLOW = "\033[0;33m"
BLUE = "\033[0;34m"
NC = "\033[0m"


def print_header(text: str) -> None:
    print(f"\n{BLUE}{'━' * 40}{NC}")
    print(f"{BLUE}{text}{NC}")
    print(f"{BLUE}{'━' * 40}{NC}")


def print_section(text: str) -> None:
    print(f"\n{BLUE}▶ {text}{NC}")


def print_success(text: str) -> None:
    print(f"  {GREEN}✓{NC} {text}")


def print_error(text: str) -> None:
    print(f"  {RED}✗{NC} {text}")


def main() -> int:
    project_dir = Path(os.environ.get("CLAUDE_PROJECT_DIR", ""))
    track_file = project_dir / "tests" / "logs" / ".claude_edited_files.txt"

    # Skip if requested
    if os.environ.get("SKIP_CODE_QUALITY_CHECKS") == "true":
        return 0

    # Skip if no tracking file
    if not track_file.exists():
        return 0

    # Read and dedupe edited files
    edited_files = sorted({line.strip() for line in track_file.read_text().splitlines() if line.strip()})
    track_file.unlink()

    if not edited_files:
        return 0

    # Classify files by type
    python_files = [f for f in edited_files if f.endswith(".py")]
    ts_vue_files = [f for f in edited_files if f.endswith((".ts", ".tsx", ".vue"))]

    has_errors = 0

    print_header("🔍 CODE QUALITY CHECK RESULTS")

    # Python checks
    if python_files:
        print_section(f"Python Files ({len(python_files)} files)")

        os.chdir(project_dir / "backend")

        # Black
        print_section("black (formatting)")
        result = subprocess.run(
            ["uv", "run", "black", "--check", *python_files],
            capture_output=True,
        )
        if result.returncode == 0:
            print_success("black")
        else:
            print_error("black - formatting issues detected")
            print(f"    Run: uv run black {' '.join(python_files)}")
            has_errors += 1

        # Ruff
        print_section("ruff (linting)")
        result = subprocess.run(
            ["uv", "run", "ruff", "check", *python_files],
            capture_output=True,
        )
        if result.returncode == 0:
            print_success("ruff")
        else:
            print_error("ruff - linting issues detected")
            print(f"    Run: uv run ruff check {' '.join(python_files)}")
            has_errors += 1

        # MyPy
        print_section("mypy (type checking)")
        result = subprocess.run(
            ["uv", "run", "mypy", *python_files],
            capture_output=True,
        )
        if result.returncode == 0:
            print_success("mypy")
        else:
            print_error("mypy - type checking issues detected")
            print(f"    Run: uv run mypy {' '.join(python_files)}")
            has_errors += 1

        os.chdir(project_dir)

    # TypeScript/Vue checks
    if ts_vue_files:
        print_section(f"TypeScript/Vue Files ({len(ts_vue_files)} files)")

        # Build includes vue-tsc
        print_section("build (type check + compile)")
        result = subprocess.run(
            ["pnpm", "run", "build"],
            capture_output=True,
        )
        if result.returncode == 0:
            print_success("build")
        else:
            print_error("build - type checking or compilation failed")
            print("    Run: pnpm run build")
            has_errors += 1

    # Summary
    print_header("SUMMARY")

    if has_errors == 0:
        print(f"{GREEN}✅ All checks passed!{NC}")
        return 0
    else:
        print(f"{RED}❌ Found {has_errors} issue(s). Please review and fix.{NC}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
