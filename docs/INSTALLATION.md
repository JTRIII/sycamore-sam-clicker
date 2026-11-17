# Installation

Sycamore Sam Clicker is a set of static files. There is nothing to install or compile.

## Requirements

- A modern web browser: Chrome, Edge, Firefox or Safari (desktop or phone).
- No internet connection, server or plug-ins are needed.

## Option 1: download a ZIP from GitHub

1. Open the project's GitHub page: <https://github.com/JTRIII/sycamore-sam-clicker>
2. Click **Code → Download ZIP**.
3. Unzip the file anywhere on your computer.
4. Open the unzipped folder and double-click `index.html`. It opens in your default browser.

## Option 2: clone with Git

```bash
git clone https://github.com/JTRIII/sycamore-sam-clicker.git
```

Then open `index.html` from the cloned folder in your browser.

## Option 3 (optional): run a local web server

Double-clicking `index.html` is enough, but a few browsers (mainly Safari) keep separate saved data
for local files. A local web server avoids that. With Python 3 installed, from the project folder:

```bash
python3 -m http.server 8602
```

Then visit <http://localhost:8602>.

## How to play

- Click the big blue leaf to earn leaves. Each click starts at 1 leaf.
- Buy buildings in the **Buildings** store on the right. They earn leaves every second.
  Use **x1 / x10 / x100** to buy several at once.
- Buy **Upgrades** (the square icons) to double building output, strengthen clicks, or boost everything.
- Hover over (or tab to) any store item to see what it does and what it costs.
- When a **Golden Sycamore Leaf** floats onto the screen, click it before it fades for a bonus.
- **Stats** shows your statistics and achievements.

## Saving your progress

- The game saves automatically to your browser **every minute**, and again when you close or switch
  away from the tab. The time of the last save is shown in the top bar.
- **Save** saves to the browser right away.
- **Export save** downloads a file such as `sycamore-sam-save-2026-11-17-14-40-00.json`. Keep it to
  back up your game or move it to another computer or browser.
- **Import save** loads one of those files and continues from where you left off.
- **Reset** erases your progress after a confirmation. Export first if you want a backup.

Clearing your browser's site data erases the browser save, but not exported save files.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Top bar says "Browser saving unavailable" | The browser is blocking local storage (for example a private window). Use **Export save** to keep progress. |
| "Import failed" message | The file is not a Sycamore Sam Clicker save or was edited incorrectly. Use an exported `.json` file. |
| Progress missing after opening the game a different way | Saves are per browser and per address. Export from the old one and import in the new one. |
