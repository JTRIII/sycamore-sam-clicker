# Sycamore Sam Clicker

An Indiana State University themed idle clicker game, written in plain HTML, CSS and JavaScript.
Click the sycamore leaf to earn leaves, then spend them on ISU-themed buildings such as Sycamore Sam,
the Blue Crew, the Fountain and Hulman Center that gather leaves for you automatically. The game has no
end.

Author: James Roberts (AI 602 – Prompt Engineering Theory and Application, Topic 10 – Coding)

## Quick start

1. Download or clone this repository: <https://github.com/JTRIII/sycamore-sam-clicker>
   (green **Code** button → **Download ZIP**).
2. Open `index.html` in any modern browser (Chrome, Edge, Firefox or Safari).

No installation, build step or internet connection is needed. See [docs/INSTALLATION.md](docs/INSTALLATION.md).

## Features

- One click of the leaf = 1 leaf. Upgrades make clicks stronger.
- 12 buildings, each 15% more expensive than the last copy (price = base × 1.15^owned).
- 110 upgrades: building doublers, click upgrades and campus-wide production boosts.
- 42 achievements, each giving +1% production.
- Golden Sycamore Leaves that appear every 2–5 minutes for a bonus (Lucky Leaf or Homecoming Frenzy).
- Automatic save to the browser every minute, plus when the tab is closed or hidden.
- **Export save** downloads a `.json` save file; **Import save** loads it to pick up where you left off.
- Offline progress: 50% of production while away, up to 8 hours.
- Indiana State colors (Sycamore Blue and white), a news ticker, and layouts for desktop and phone.
- Real ISU photos and logos for every building and upgrade, credited in [images/README.md](images/README.md).

## Documentation

| Document | Contents |
| --- | --- |
| [Installation](docs/INSTALLATION.md) | Downloading and playing the game |
| [Developer guide](docs/DEVELOPER_GUIDE.md) | Design, folder structure, entry points |
| [Testing](docs/TESTING.md) | Tests performed and bugs fixed |
| [Prompt summary](docs/PROMPT_SUMMARY.md) | Prompts used and decisions made |
| [Computing resources](docs/COMPUTING_RESOURCES.md) | AI and local computer time |
| [AI use](docs/AI_USE.md) | Commands run by the AI and permissions used |

## Disclaimer

A student project for a course. It is not affiliated with or endorsed by Indiana State University.
Indiana State University names and logos are trademarks of the university. Photo credits and licenses are in
[images/README.md](images/README.md).
