/*
 * Sycamore Sam Clicker - real ISU images.
 *
 * Each entry points to an image file used in place of the emoji icon. Set an
 * entry to null to go back to the emoji. Square images look best.
 * Every image here must be credited in images/README.md.
 *
 * The big clickable leaf is the ISU sycamore leaf from the university logo,
 * built into index.html. To use a different leaf picture, set `leaf` to its path.
 */
(function (root) {
  'use strict';
  const SSC = (root.SSC = root.SSC || {});
  SSC.images = {
    leaf: null,                                  // big clickable leaf (null = built-in ISU leaf)
    // buildings
    sapling: 'images/buildings/sapling.jpg',     // Sycamore Sapling
    sam: 'images/buildings/sam.svg',             // Sycamore Sam (Sycamores athletics logo)
    bluecrew: 'images/buildings/bluecrew.jpg',   // Blue Crew
    fountain: 'images/buildings/fountain.jpg',   // The Fountain
    normalhall: 'images/buildings/normalhall.jpg', // Normal Hall
    library: 'images/buildings/library.jpg',     // Cunningham Library
    stadium: 'images/buildings/stadium.jpg',     // Memorial Stadium
    hulman: 'images/buildings/hulman.jpg',       // Hulman Center
    bird: 'images/buildings/bird.jpg',           // Larry Bird Legacy
    parade: 'images/buildings/parade.jpg',       // Homecoming Parade
    wabash: 'images/buildings/wabash.jpg',       // Banks of the Wabash
    alumni: 'images/buildings/alumni.jpg',       // Sycamore Alumni Network
    // upgrade types that are not tied to one building
    click: 'images/upgrades/click.jpg',          // click upgrades
    clickPct: 'images/upgrades/clickPct.jpg',    // "study" click upgrades
    global: 'images/upgrades/global.jpg',        // campus-wide production upgrades
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
