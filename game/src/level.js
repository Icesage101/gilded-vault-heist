// The Gilded Vault — the vault floor.
// One vault, two floors of rooms, drawn as a tile map. Legend:
//   # wall (blocks movement and sight)   . floor
//   C display case (blocks movement and sight)
//   S thief spawn   E getaway exit   * the Gilded Star
//   L side loot     K camera mount (a marker; cameras live in cameras.js)
//
// The three routes to the Star:
//   north hall — through the doorway at (7,3), past the guard on the top band
//   camera corridor — east through (16,4), under the sweeping camera at (20,2)
//   service passage — down the west gap at (2,6), past the guard on the middle band
// The middle band is crossed at three gaps in row 6; two of them are watched
// by laser tripwires (lasers.js). All three routes meet at the vault cage,
// whose only door is the east gap at (14,9) — and a laser guards the way out.
// Downstairs, the south band splits in two: the strongroom (west, its own
// guard, the ruby necklace) and the getaway hall (east, the van).

import { COLS, ROWS, TILE } from './config.js';

export const TILEMAP = [
  '########################',
  '#S.....#........#......#',
  '#......#........#...K..#',
  '#..C.......C....#......#',
  '#......#...........C...#',
  '#....C.#...C....#......#',
  '##.#######.########.####',
  '#......#........#.K....#',
  '#......#..#####....C...#',
  '#.........#.*...#......#',
  '#......#..#####.#...C..#',
  '###.########.#######.###',
  '#..L.....#..L........K.#',
  '#..................L..E#',
  '########################',
];

export function tileAt(col, row) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return '#';
  return TILEMAP[row][col];
}

export function isSolidTile(col, row) {
  const tile = tileAt(col, row);
  return tile === '#' || tile === 'C';
}

// Walls and cases block sight; floor, loot and markers do not.
export function blocksSight(col, row) {
  return isSolidTile(col, row);
}

export function tileCenter(col, row) {
  return { x: (col + 0.5) * TILE, y: (row + 0.5) * TILE };
}

export function findTile(mark) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (TILEMAP[row][col] === mark) return { col, row };
    }
  }
  return null;
}

export function findAllTiles(mark) {
  const found = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (TILEMAP[row][col] === mark) found.push({ col, row });
    }
  }
  return found;
}

export const SPAWN_TILE = findTile('S');
export const EXIT_TILE = findTile('E');
export const STAR_TILE = findTile('*');

// Side loot: each entry is a tile plus the loot kind it holds.
export const LOOT_SPOTS = [
  { ...findTile('L'), kind: 'gold' }, // gold bars, in the strongroom
  { col: 12, row: 12, kind: 'ledger' }, // the vault ledger, south-middle
  { col: 19, row: 13, kind: 'emerald' }, // the emerald tiara, by the exit
  { col: 21, row: 4, kind: 'crown' }, // the crown jewels, north-east gallery
  { col: 4, row: 13, kind: 'ruby' }, // the ruby necklace, strongroom floor
];

// Guard patrols: tile waypoints, walked in order and then reversed.
export const GUARD_PATROLS = [
  {
    name: 'Hall Guard',
    waypoints: [
      { col: 9, row: 2 },
      { col: 14, row: 2 },
      { col: 14, row: 4 },
      { col: 9, row: 4 },
    ],
  },
  {
    name: 'Vault Guard',
    waypoints: [
      { col: 2, row: 8 },
      { col: 5, row: 8 },
      { col: 5, row: 9 },
      { col: 2, row: 9 },
    ],
  },
  {
    name: 'South Guard',
    waypoints: [
      { col: 11, row: 12 },
      { col: 18, row: 12 },
      { col: 18, row: 13 },
      { col: 11, row: 13 },
    ],
  },
  {
    name: 'Strongroom Guard',
    waypoints: [
      { col: 2, row: 12 },
      { col: 7, row: 12 },
      { col: 7, row: 13 },
      { col: 2, row: 13 },
    ],
  },
];

// Cameras: tile position, the direction they face at rest, and their sweep.
export const CAMERA_SPOTS = [
  { col: 20, row: 2, facing: Math.PI * 0.75, sweep: 0.9 }, // north-east, sweeps the camera corridor
  { col: 18, row: 7, facing: Math.PI, sweep: 1.1 }, // middle band east, sweeps the cage approach
  { col: 21, row: 12, facing: Math.PI, sweep: 0.8 }, // south-east, sweeps the getaway run
];

// Laser tripwires: one floor tile each, on the routes a thief must cross.
// axis 'h' beams run left-right across a north-south passage (the row-6
// gaps); axis 'v' beams run top-bottom across an east-west corridor.
//   (10,6) and (19,6) watch two of the three middle-band crossings
//   (15,9) watches the only way out of the vault cage
//   (21,13) watches the last step of the getaway run
export const LASER_SPOTS = [
  { col: 10, row: 6, axis: 'h' },
  { col: 19, row: 6, axis: 'h' },
  { col: 15, row: 9, axis: 'v' },
  { col: 21, row: 13, axis: 'v' },
];

// Set dressing, drawn by render.js: gilt paintings hung on wall tiles,
// money bags slumped on floor tiles, and the great vault door itself,
// set into the cage's south wall.
export const PAINTING_TILES = [
  { col: 3, row: 0 },
  { col: 12, row: 0 },
  { col: 20, row: 0 },
  { col: 5, row: 6 },
  { col: 14, row: 6 },
  { col: 7, row: 11 },
  { col: 16, row: 11 },
  { col: 6, row: 14 },
  { col: 17, row: 14 },
];

export const MONEYBAG_TILES = [
  { col: 1, row: 4 },
  { col: 22, row: 8 },
  { col: 1, row: 12 },
];

export const VAULT_DOOR_TILE = { col: 12, row: 10 };
