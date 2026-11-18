# Computing Resources

## AI model time (cloud)

| Item | Value |
| --- | --- |
| Tool | Claude Code in the Claude desktop app |
| Model | Claude Opus 5.5 (`claude-opus-5-5`), running on Anthropic's cloud |
| Session start (first command) | 2026-11-17 14:38:13 local time |
| Code and testing finished | about 14:46 local time |
| Total session time | about 10–12 minutes from first prompt to finished documentation |

The model was generating text (reading the specification, writing code and documents, and deciding
on next steps) for most of that time. The exact compute time on Anthropic's servers is not reported to
the user, so the session wall-clock time above is the best available measure of cloud AI time.
Token usage for the session can be viewed in the Claude app's usage information.

### Image update (2026-11-18)

About 20 minutes of session time from the request for pictures to the pushed update: searching and
comparing images, extracting the ISU leaf, editing code and documents, and testing.

## Development computer time (local)

Development computer: Mac running macOS (Darwin 22.6.0), Node.js 20.17.0, Python 3.14.

| Activity | Time |
| --- | --- |
| Extract text from the specification `.docx` (`textutil`) | < 1 s |
| Unit tests (`node --test tests/`), run 3 times | about 0.7 s each, about 2 s total |
| Local web server (`python3 -m http.server`) for browser testing | running about 5 minutes, nearly idle |
| Built-in browser: loading and playing the game, screenshots, page scripts | about 3 minutes in total |
| File writes, `git` commands, line counts | < 5 s total |
| Image update: about 40 small API requests and 45 image downloads (spaced out after Wikimedia rate-limited quick requests), ImageMagick crops and contact sheets, browser testing | about 5 minutes, mostly waiting on the network |

Total active work on the development computer was a few minutes; the game itself needs no build
step and uses very little CPU while running.
