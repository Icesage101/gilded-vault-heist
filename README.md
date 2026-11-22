# The Gilded Vault — a top-down heist game

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/Icesage101/gilded-vault-heist/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/Icesage101/gilded-vault-heist/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

One thief, one vault, one very shiny diamond. **The Gilded Vault** is a complete top-down heist game that runs offline in a desktop browser from its own files: cross two floors of marble halls, galleries and a strongroom past patrolling guards, sweeping security cameras and laser tripwires, lift the Gilded Star, grab what else you can carry, and reach the getaway van before the alarm meter tops out. All art is drawn procedurally in code (marble floors, gilt paintings, display cases with treasures inside, spotlight pools, sparkle and smoke particles), all sound is synthesized with WebAudio, and nothing loads over the network at runtime.

## How to play

- **Move** with WASD or the arrow keys, or click a floor spot to walk there. Hold **Shift** to sneak: slower, but the alarm fills half as fast while you are seen — and sneaking crawls *under* laser beams.
- **Guards think in states.** They patrol with red vision cones; at alarm 35 the nearest guard turns **suspicious** and stares at your spot; at 70 one comes to **investigate**; at 55 and up, a guard who can see you **chases** — and a chasing guard who reaches you ends the job on the spot. Break line of sight and the trail goes cold.
- **Cameras** sweep blue cones across the rooms they watch. Walls and display cases block sight, so read the cones before you move.
- **Laser tripwires** guard the crossings that matter: two of the three middle-band gaps, the only way out of the vault cage, and the last step of the getaway run. Cross one upright and the alarm spikes and a guard comes to look. Sneak under it, or snip it dead with the cutter.
- The **alarm meter** fills while any guard or camera can see you and drains while you stay hidden. At 100 the alarm trips, and you have a short grace to break line of sight before you are busted.
- **Tools, each bought with score:** `[1]` smoke pellet (blinds cones for 5s), `[2]` EMP burst (cameras dark for 8s), `[3]` decoy coin (click a spot; the nearest guard goes to look), `[4]` glass cutter (snips the nearest laser beam for good). Tools cost points, so spend them like the professional you are.
- **Loot:** the Gilded Star ($1,000) is the job. Gold bars, the vault ledger, the emerald tiara, the crown jewels and the ruby necklace are bonus. The getaway van only leaves once the Star is lifted.
- **Combos:** loot lifted within 8 seconds of the last piece pays double, triple, and up — chain the strongroom, do not dawdle. **Ghost bonus:** finish with the alarm never past 50 and the getaway pays an extra $300.
- **Score** is loot (with combos) plus a time bonus for a fast job plus the ghost bonus, minus whatever the tools cost. **P** pauses, **M** mutes, **R** restarts, **Enter** starts.

## Three ways across the floor

- **North hall** — through the doorway by the display cases, past the hall guard. Its middle crossing is laser-watched.
- **Camera corridor** — east along the top band, under the sweeping camera. Its crossing is laser-watched too.
- **Service passage** — down the west gap, the one crossing with no beam, past the vault guard on the middle band.

All three meet at the vault cage, whose only door is the east gap — and a laser guards the way back out. Downstairs, the strongroom (west) holds the gold and the ruby under its own guard; the getaway hall (east) ends at the van.

## Run it

```sh
python3 -m http.server 8080 --directory game
```

Then open http://localhost:8080 in desktop Chrome. (Any static server works; `game/index.html` loads only files under `game/`.) Screenshot states for the maker: `?shot=start`, `?shot=play`, `?shot=alarm`, `?shot=win`.

## Layout

- `game/index.html` — page shell and styling
- `game/src/config.js` — tuning constants and palette
- `game/src/level.js` — the vault floor, loot, patrols, camera mounts, laser spots and set dressing
- `game/src/thief.js` — the thief: movement, sneak, four tools, combo streaks
- `game/src/guards.js` — guard patrols, vision cones, suspicion, investigation and chases
- `game/src/cameras.js` — camera sweeps and their cones
- `game/src/lasers.js` — laser tripwires: tripping, crawling under, cutting
- `game/src/particles.js` — sparks, puffs and the sparkles over loot
- `game/src/alarm.js` — the alarm meter, suspicion trigger and the fair caught moment
- `game/src/audio.js` — synthesized WebAudio sounds
- `game/src/render.js` — all canvas drawing: room, cones, people, HUD
- `game/src/engine.js` — game state, loop, scoring, win and lose
- `game/src/input.js` — keyboard and mouse input
- `game/src/shots.js` — deterministic staged states for screenshots
- `game/src/main.js` — bootstrap
- `main.ts` — hands the entry in: copies `game/` and `screenshots/` to `/output` and writes `dossier.json` with the kit's vendored `vendor/makefun-game.ts`
- `screenshots/` — real renders of the game's own code in headless Chrome

## Entry

Built for the make.fun bounty [best-heist-game-20261122-0559](https://make.fun/bounty/best-heist-game-20261122-0559) ("Make the best heist game", $50 pot, entries close 2026-11-22T17:59:00Z). MIT licensed. Original game: no assets, names or sounds are copied from any commercial game.
