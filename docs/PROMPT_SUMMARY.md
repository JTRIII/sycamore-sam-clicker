# Prompt Summary

The project was built with Claude Code (model: Claude Opus 5.5) in the Claude desktop app on
2026-11-17.

## Prompts

### Prompt 1 (user)

> Please read this document and create the game in a new folder in the AI 602 - Prompt Engineering
> Theory and Application folder. Let me know if you have any questions or need any input.

The attached document was the project specification, *James Roberts AI 602 Topic 10 - Coding.docx*
("Sycamore Sam Clicker Browser Game"). It asked for:

- An Indiana State University version of a Cookie Clicker style idle game: click a sycamore leaf,
  buy ISU-themed upgrades (for example Sycamore Sam and the Fountain), no ending.
- HTML, CSS and JavaScript only, runnable in any browser.
- GitHub for tracking progress and distributing the game.
- Autosave every minute, plus saving to a local file and importing it.
- A classic clicker look in ISU colors, with images of real ISU logos, places and people.
- One click = 1, and 1.15 price scaling per upgrade.
- Six documents: Installation, Developer guide, Testing, Prompt summary, Computing resources, AI use.

The AI produced the whole project from this single prompt: the game, unit tests, browser testing,
fixes, and documentation.

## Decisions made

Decisions made by the user (in the specification):

- Theme, name, technology (plain HTML/CSS/JS), save requirements, click value of 1, 1.15 scaling,
  ISU colors, and the list of documents.

Decisions made by the AI where the specification left room (the user can change any of these):

| Decision | Choice | Reason |
| --- | --- | --- |
| Folder | `Sycamore Sam Clicker/` inside the course folder | Matches the game title |
| "Save locally" | Two kinds: automatic browser save (`localStorage`, every 60 s and on tab close) and a downloadable `.json` save file with Import | Covers both "autosave" and "save file to load later" |
| Buildings | 12 ISU-themed producers, from Sycamore Sapling (15 leaves) to Sycamore Alumni Network | Places and people named in or suggested by the spec |
| Extra mechanics | Upgrades, achievements (+1% each), golden leaves, offline earnings (50%, up to 8 h), buy x1/x10/x100, stats, news ticker | Standard features of the genre that make an endless game rewarding |
| Look | Three-column layout, Sycamore Blue (#00669A), navy and white, a leaf drawn in SVG, original art and text | Genre-style look in ISU colors without copying another game's artwork |
| Images | Emoji icons by default; real ISU photos and logos can be listed in `images/images.js` | ISU logos and photos are owned by the university and photographers, so the AI did not download them without the user's permission |
| GitHub | Local Git repository with commits; pushing to GitHub left for the user to approve | Publishing to GitHub is an outward-facing action |
| Tests | Node's built-in test runner, no packages | Keeps the project dependency-free |

## Open items for the user

- Add real ISU images (see `images/README.md`) or ask the AI to find openly licensed ones.
- Create the GitHub repository and push (or ask the AI to do it).
