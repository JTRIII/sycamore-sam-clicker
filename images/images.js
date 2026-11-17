/*
 * Sycamore Sam Clicker - real ISU images.
 *
 * Put image files in this folder (images/ or images/buildings/), then set the
 * matching entry below to the file's path, e.g.
 *     sam: 'images/buildings/sam.jpg',
 * Leave an entry as null to keep the emoji icon. Square images look best.
 * Only use images you have permission to use (see images/README.md).
 */
(function (root) {
  'use strict';
  const SSC = (root.SSC = root.SSC || {});
  SSC.images = {
    leaf: null,        // the big clickable leaf, e.g. ISU's sycamore leaf logo (transparent PNG works best)
    sapling: null,     // Sycamore Sapling
    sam: null,               // Sycamore Sam, the mascot
    bluecrew: null,    // Blue Crew student section
    fountain: null,    // The Fountain on campus
    normalhall: null,  // Normal Hall
    library: null,     // Cunningham Memorial Library
    stadium: null,     // Memorial Stadium
    hulman: null,      // Hulman Center
    bird: null,        // Larry Bird statue
    parade: null,      // Homecoming Parade
    wabash: null,      // Banks of the Wabash
    alumni: null,      // Alumni / commencement
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
