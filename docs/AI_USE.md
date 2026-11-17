# AI Use

The project was created by Claude Code (Claude Opus 5.5) in the Claude desktop app. This document
lists what the AI did on the development computer and which permissions were used.

## Permissions used

| Permission | Used for | Scope |
| --- | --- | --- |
| Read files | The specification `.docx` in Downloads; listing the course folder | Read only |
| Write files | Creating every file in `Sycamore Sam Clicker/`, and `.claude/launch.json` in the course folder (local preview server settings) | Course folder only |
| Run shell commands | Commands listed below | Local only |
| Built-in browser | Loading the game from `http://localhost:8602`, screenshots, clicking, running test scripts in the page, resizing to desktop and phone sizes | Local game only |

Not used: no internet access, no downloads, no packages installed, no GitHub push, no system
settings changed, no files outside the course folder changed (a temporary copy of the `.docx` was
placed in the AI's own scratch folder for reading).

## Commands run

| # | Command | Purpose |
| --- | --- | --- |
| 1 | `cp <spec>.docx <scratch>/a.docx && textutil -convert txt -stdout a.docx; ls <course folder>` | Read the specification and see the course folder |
| 2 | `date; which node git python3; node --version; git --version` | Record the start time and check available tools |
| 3 | `node --test tests/` | Run unit tests (16 passed) |
| 4 | `rm -r "Sycamore Sam Clicker/.claude"; mkdir -p .claude; cat > .claude/launch.json` | Move the preview server settings to the course folder |
| 5 | `python3 -m http.server 8602 --directory "Sycamore Sam Clicker"` (started by the app's preview tool) | Serve the game for browser testing |
| 6 | `sed -i '' ... js/game.js` | Fix bug 1 (empty upgrades hint) |
| 7 | `python3 - <<EOF ... EOF` (edit CSS and data) | Fix bugs 2 and 3 (gold leaf color, Sam icon) |
| 8 | `python3 - <<EOF ... EOF` (edit game and data); `node --test tests/` | Fix bugs 5 and 6 and re-run tests |
| 9 | `python3 - <<EOF ... EOF`; `cat > images/images.js` | Fix bug 4 (image list instead of probing) |
| 10 | `printf ... > images/buildings/zz-test.svg; sed ...` and later `rm ...; sed ...` | Add, then remove, a temporary test image |
| 11 | `date; wc -l ...` | Record time and count lines of code |
| 12 | `git init`, `git add`, `git commit` | Create the local Git repository and first commit |

Files were also created and edited with the AI tool's file-writing feature (not shell commands).

## Browser actions

In the built-in browser the AI: opened the game, cleared the test save, clicked the leaf and store
items using page scripts, imported a valid and an invalid save file, clicked a golden leaf, opened the
Stats panel, and took screenshots at 1400×850 and 375×812. All actions were on the local game only.

## Human review

The user should review the code and documents before submitting, add real ISU images that they have
permission to use, and decide when to publish the repository to GitHub.
