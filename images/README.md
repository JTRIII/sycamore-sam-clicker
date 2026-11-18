# Images and Credits

The game's pictures are real photos and logos of Indiana State University, its campus and Terre
Haute. All of them come from [Wikimedia Commons](https://commons.wikimedia.org) and are public domain
or released under licenses that allow reuse with credit. They were downloaded on 2026-11-18.

## Changes made to the images

Every photo was **cropped to a square and resized to 320 × 320 pixels** to fit the game's icons. Images
under a CC BY-SA license stay under that same license after cropping. The Sycamore Sam logo is used
unchanged.

The big clickable leaf, the golden leaf, the falling leaves and the small leaf icons
(`images/isu-leaf.svg`, `images/isu-leaf-gold.svg`) use the **sycamore leaf traced from the Indiana
State University logo**: [Indiana State University logo.svg](https://commons.wikimedia.org/wiki/File:Indiana_State_University_logo.svg),
public domain (too simple to be copyrighted), **trademark of Indiana State University**. Only the
leaf shape was kept; it was recolored.

## Credits

| File | Used for | Source | Author | License |
| --- | --- | --- | --- | --- |
| `buildings/sam.svg` | Sycamore Sam | [Indiana State Sycamores logo.svg](https://commons.wikimedia.org/wiki/File:Indiana_State_Sycamores_logo.svg) | Indiana State Sycamores (vector drawing by Corkythehornetfan) | Public domain; trademark of Indiana State University |
| `buildings/sapling.jpg` | Sycamore Sapling | [Seedling American Sycamore.jpg](https://commons.wikimedia.org/wiki/File:Seedling_American_Sycamore.jpg) | PerytonMango | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `buildings/bluecrew.jpg` | Blue Crew | [Hulman Center 02-05-14 ISU vs WSU.jpg](https://commons.wikimedia.org/wiki/File:Hulman_Center_02-05-14_ISU_vs_WSU.jpg) | ISU | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `buildings/fountain.jpg` | The Fountain | [Indiana State University Fountain.jpg](https://commons.wikimedia.org/wiki/File:Indiana_State_University_Fountain.jpg) | Anna Kelly from Terre Haute, IN, USA | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) |
| `buildings/normalhall.jpg` | Normal Hall | [Normal Hall Exterior from South.jpg](https://commons.wikimedia.org/wiki/File:Normal_Hall_Exterior_from_South.jpg) | EchoEternal | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `buildings/library.jpg` | Cunningham Library | [ISU Cunningham Memorial Library.JPG](https://commons.wikimedia.org/wiki/File:ISU_Cunningham_Memorial_Library.JPG) | C. Bedford Crenshaw | Free use with attribution ([terms](https://commons.wikimedia.org/wiki/File:ISU_Cunningham_Memorial_Library.JPG)) |
| `buildings/stadium.jpg` | Memorial Stadium | [ISU Memorial Stadium.jpg](https://commons.wikimedia.org/wiki/File:ISU_Memorial_Stadium.jpg) | Tcampbell | Public domain |
| `buildings/hulman.jpg` | Hulman Center | [Hulman Center.JPG](https://commons.wikimedia.org/wiki/File:Hulman_Center.JPG) | C. Bedford Crenshaw | Free use with attribution ([terms](https://commons.wikimedia.org/wiki/File:Hulman_Center.JPG)) |
| `buildings/bird.jpg` | Larry Bird Legacy | [Larry Bird ISU.jpg](https://commons.wikimedia.org/wiki/File:Larry_Bird_ISU.jpg) | Unknown (historical photo) | Public domain |
| `buildings/parade.jpg` | Homecoming Parade | [ISU marching band.jpg](https://commons.wikimedia.org/wiki/File:ISU_marching_band.jpg) | Tcampbell | Public domain |
| `buildings/wabash.jpg` | Banks of the Wabash | [Wabash River Fairbanks Park downstream.JPG](https://commons.wikimedia.org/wiki/File:Wabash_River_Fairbanks_Park_downstream.JPG) | C. Bedford Crenshaw (Bedford) | Free use with attribution ([terms](https://commons.wikimedia.org/wiki/File:Wabash_River_Fairbanks_Park_downstream.JPG)) |
| `buildings/alumni.jpg` | Sycamore Alumni Network | [1912-13 Indiana State Normal School Sycamores.jpg](https://commons.wikimedia.org/wiki/File:1912-13_Indiana_State_Normal_School_Sycamores.jpg) | Unknown (historical photo) | Public domain |
| `upgrades/click.jpg` | Click upgrades | [Sycamore Tree Leaf.jpg](https://commons.wikimedia.org/wiki/File:Sycamore_Tree_Leaf.jpg) | John P Salvatore | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| `upgrades/clickPct.jpg` | Study upgrades (click % of production) | [Fairbanks Hall Dome.jpg](https://commons.wikimedia.org/wiki/File:Fairbanks_Hall_Dome.jpg) | Tcampbell | Public domain |
| `upgrades/global.jpg` | Campus-wide upgrades | [DedePlazaISU.jpg](https://commons.wikimedia.org/wiki/File:DedePlazaISU.jpg) | Tcampbell | Public domain |

There was no openly licensed photo of the Sycamore Sam mascot or of the Larry Bird statue at Hulman
Center, so Sycamore Sam uses the Sycamores athletics logo, and the "Larry Bird Legacy" building uses
a photo of Larry Bird from ISU's 1977 *Sycamore* yearbook. If you take your own photo of either, save
it here and update `images/images.js` and this table.

Indiana State University names and logos are trademarks of the university. This is a non-commercial
student project and is not affiliated with or endorsed by Indiana State University.

## Changing an image

1. Put the new file in `images/buildings/` or `images/upgrades/` (any browser image format; square
   images look best).
2. Point the matching entry in `images/images.js` at it (set an entry to `null` to use an emoji).
3. Add a row to the credits table above with the source, author and license.
