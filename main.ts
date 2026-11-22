// The Gilded Vault — a top-down heist game for the make.fun best-heist-game
// bounty. This program hands the entry in: it copies the game's static files
// (game/) and its screenshots (screenshots/) from this repository into the
// output directory and writes dossier.json there, the summary the judge reads,
// built with the kit's vendored make.fun library.
//
// The game itself is plain static files a desktop browser loads offline:
// game/index.html and its ES modules, no library and no network request.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Where this program lives, and where the entry goes.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps, from the competition's gate: the game stays under
// 993 files and 48 MiB, screenshots under 4 files and 256 KiB each, and the
// dossier text under 160 KiB. Anything over those is refused up front here,
// so a bad bundle never reaches the server.
const DOSSIER_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function copyEntry(sourceDir, targetDir) {
  mkdirSync(targetDir, { recursive: true });
  cpSync(sourceDir, targetDir, { recursive: true });
}

// Start from a clean output directory, so a stale file from an earlier run
// can never ride along with the entry. Only the CONTENTS are cleared: the
// grader mounts the output directory itself, and removing that mount point
// fails (EBUSY) and kills the run with exit 1 — that was the dev-grade
// failure on the first submission. The stealth entry never removed it.
mkdirSync(outputDir, { recursive: true });
for (const name of readdirSync(outputDir)) {
  rmSync(join(outputDir, name), { recursive: true, force: true });
}

copyEntry(join(repoRoot, 'game'), join(outputDir, 'game'));
if (existsSync(join(repoRoot, 'screenshots'))) {
  copyEntry(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'));
}

writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, DOSSIER_LIMITS));
console.log(`The Gilded Vault handed in to ${outputDir}`);
