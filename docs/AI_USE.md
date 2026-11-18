# AI Use

The project was created by Claude Code (Claude Opus 5.5) in the Claude desktop app. This document
lists what the AI did on the development computer and which permissions were used.

## Permissions used

| Permission | Used for | Scope |
| --- | --- | --- |
| Read files | The specification `.docx` in Downloads; listing the course folder | Read only |
| Write files | Creating every file in `Sycamore Sam Clicker/`, and `.claude/launch.json` in the course folder (local preview server settings) | Course folder only |
| Run shell commands | Commands listed below | Local only |
| Internet (read and download) | Searching Wikimedia Commons and Openverse; downloading the chosen images (approved by the user in Prompt 4) | commons.wikimedia.org, upload.wikimedia.org, api.openverse.org |
| GitHub over SSH | Pushing to `JTRIII/sycamore-sam-clicker`, using the SSH key already set up on the computer | Approved by the user in chat |
| Built-in browser | Loading the game from `http://localhost:8602`, screenshots, clicking, running test scripts in the page, resizing to desktop and phone sizes | Local game only |

Not used: no packages installed, no system
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
| 13 | `which gh`, `gh auth status`, `which brew port`, `git config --global credential.helper`, `ls ~/.ssh`, `ssh -T git@github.com` | Check how the computer can reach GitHub (GitHub CLI not installed; SSH key works) |
| 14 | `git ls-remote`, `git remote add origin git@github.com:JTRIII/sycamore-sam-clicker.git`, `git push -u origin main` | Push the project to the repository the user created (after the user approved) |
| 15 | `git commit`, `git push` | Add the repository link to the documentation |
| 16 | `curl` to the Wikimedia Commons API (search, category listing, image license info) through small Python helper scripts in the AI's scratch folder | Find openly licensed ISU images and their licenses |
| 17 | `curl` to the Openverse API | Look for a Sycamore Sam photo (none openly licensed) |
| 18 | `curl` downloads from upload.wikimedia.org / thumb.wikimedia.org into the scratch folder | Preview and final images |
| 19 | `magick montage` | Contact sheets to compare candidates visually |
| 20 | Python script splitting the ISU logo SVG path; `magick` render | Trace the leaf out of the ISU logo |
| 21 | `grep` on the downloaded SVG | Check it contains no scripts or links |
| 22 | `magick ... -resize 320x320^ -extent 320x320` | Crop photos into `images/buildings/` and `images/upgrades/` |
| 23 | Python edits to `index.html`, `js/game.js`, `js/data.js`, `css/style.css`, docs; `node --test tests/` | Use the images and leaf; update docs; re-run tests |
| 24 | `git add`, `git commit`, `git push` | Publish the image update |

Files were also created and edited with the AI tool's file-writing feature (not shell commands).

## Browser actions

In the built-in browser the AI: opened the game, cleared the test save, clicked the leaf and store
items using page scripts, imported a valid and an invalid save file, clicked a golden leaf, opened the
Stats panel, and took screenshots at 1400×850 and 375×812. All actions were on the local game only.

## Human review

The user should review the code, documents and image credits before submitting, and keep the GitHub repository up to date with `git push` after future changes.
