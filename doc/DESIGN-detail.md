# GoGame 3D — Implementation Reference

Companion to [`DESIGN.md`](./DESIGN.md). This file describes the code as it is
implemented today, including the model tensor layout, visual formulas, platform
integration, test commands, and remaining gaps.

Version: `0.1.0` (package version, not a released contract).

## 1. Repository map

```
index.html                 Toolbar, canvases, overlays, status bar
src/main.ts                PWA registration, controller construction, debug hook
src/style.css              Layout, toolbar, overlays, spinner
src/platform/env.ts        isElectron()
src/game/BoardSize.ts      BoardSize, default komi, star points, neighbors
src/game/Goban.ts          Rules, captures, ko, undo, scoring, SGF
src/ai/registry.ts         Model URL construction
src/ai/tensor.ts           KataGo input encoding, output slicing, policy softmax
src/ai/KataGoEngine.ts     Model resolution/loading/execution
src/ai/select.ts           Policy-based move/pass selection
src/ui/GameController.ts   Turn loop, controls, AI, undo, SGF, status
src/ui/Board3D.ts          Babylon scene, heat texture, chess-piece pool, picking
src/ui/Board2D.ts          Canvas fallback board
src/ui/heatmap.ts          Ownership color mapping
src/ui/pieceRank.ts        Ownership thresholds -> chess rank / dead flag
electron/main.cjs          Window, app:// protocol, dev/preview selection
electron/preload.cjs       Exposes window.__ELECTRON__
scripts/fetch-models.mjs   Downloads TF.js model files
scripts/convert-fbx.mjs    FBX -> GLB conversion
scripts/models.config.json Model sources and optional small-board nets
public/models/             Bundled dan/kyu 19x19 TF.js models
public/assets/chess/       Converted chess-piece GLBs
public/icons/              PWA icons
tests/                     Vitest unit and gated model-integration tests
doc/                       This documentation
.github/workflows/deploy.yml GitHub Pages build + deploy
```

`katago-model/go/` is the original 2D reference app and is not used by the build.
`Dark_Yagami/` contains the source FBX chess pack.

## 2. Commands

| Command | Purpose |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Vite dev server at `http://localhost:5173` |
| `npm run build` | `tsc --noEmit` + production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Vitest unit tests (model integration skipped) |
| `RUN_MODEL_TESTS=1 npx vitest run tests/models.integration.test.ts` | Real-model inference test |
| `npm run fetch:models` | Download the 19×19 TF.js models |
| `npm run convert:fbx` | Convert FBX pieces to GLB |
| `npm run electron:dev` | Vite dev server + Electron |
| `npm run electron:build` | Production build + electron-builder installers |
| `GOGAME_BUNDLE=1 npx electron .` | Serve `dist/` via `app://` without packaging |
| `GOGAME_BUNDLE=1 GOGAME_DEBUG=1 npx electron .` | Same, exposing `window.__game` |

## 3. Boot sequence

1. `index.html` loads `/src/main.ts` as a module.
2. `src/main.ts`:
   - If not Electron and `serviceWorker` exists, dynamically imports
     `virtual:pwa-register` and calls `registerSW({ immediate: true })`.
   - Constructs `GameController`.
   - In Vite dev mode, or when the URL has `?debug=1`, assigns the controller to
     `window.__game` for automation and debugging.
   - Calls `controller.start()`.
3. `GameController` constructor:
   - Reads `#board-size`, `#ai-level`, and `#komi` from the DOM.
   - Creates `Goban`, `Board3D`, and `Board2D`.
   - Wires controls, renders once, and updates the status bar.
4. `start()`:
   - `KataGoEngine.initialize()` selects WebGL, falls back to CPU, then waits for
     `tf.ready()`.
   - `refreshEvaluation(true)` evaluates the empty board and updates the heatmap.
   - The `#boot` overlay is hidden in `finally`; on failure the status bar reads
     `AI unavailable — check console`.

The model is fetched lazily by the first evaluation, which is also when the
registry probes for a dedicated small-board model.

## 4. UI and controller

### DOM contract

`GameController` requires these IDs (missing ones throw):

| ID | Element |
| --- | --- |
| `scene3d` | Babylon canvas |
| `scene2d` | Canvas fallback |
| `board-size` | `select` (9, 13, 19) |
| `ai-level` | `select` (`dan`, `kyu`) |
| `komi` | number input |
| `btn-new`, `btn-pass`, `btn-undo`, `btn-eval`, `btn-view`, `btn-save`, `btn-load` | buttons |
| `file-sgf` | hidden file input |
| `thinking` | thinking overlay |
| `boot` | boot overlay |
| `turn` | status text |
| `score` | evaluation text |

### Controller state

- `goban` — current `Goban`.
- `level` — `'dan' | 'kyu'`, from `#ai-level`.
- `view` — `'3d' | '2d'`.
- `evaluation` — last `Evaluation` or `null`.
- `busy` — true while the AI is thinking; blocks human input and undo.
- `gameOver` — set after two consecutive passes.
- `evaluationToken` — guards stale async evaluations.
- `board3d`, `board2d`, `engine`, `els`.

### Turn loop

`humanPlay(index)`:

1. Ignore if `busy`, `gameOver`, or side is not Black.
2. `goban.play(index)`; on failure, do nothing.
3. Set the new move's `weight` to `0.35`.
4. Render, update status, check for two passes.
5. If still playing, `await aiTurn()`.

`aiTurn()`:

1. Set `busy`, show `#thinking`.
2. `engine.chooseMove(goban, level)`.
3. If `move === null`, pass; otherwise play it and set its weight to
   `evaluation.policy[move]` (probability) or `0.3` when unavailable.
4. Evaluate the resulting position for display. If that evaluation fails, keep
   the pre-move evaluation from `chooseMove`.
5. Render, update status, check game over.
6. Clear `busy` and hide `#thinking`.

`humanPass()` follows the same shape, records a pass with weight `0.3`, and lets
the AI respond.

`undo()`:

- Ignore while `busy`.
- Undo up to two plies, stopping when Black is to move.
- Clear `gameOver` and `evaluation`, render, then re-evaluate without the
  thinking overlay.

`refreshEvaluation(showThinking)`:

- Increments `evaluationToken`; only the latest result is applied.
- Shows/hides the thinking overlay when requested.
- Errors are logged and leave the previous evaluation intact.

### Board-size and option changes

- `startNewGame()` builds a fresh `Goban` with the selected size and current
  komi, resets the renderer, and evaluates.
- `changeBoardSize()` also resets komi to `DEFAULT_KOMI[size]` and updates the
  komi input.
- Changing AI level or komi does not reset the game; it re-evaluates.
- The 2D/3D button toggles canvas `hidden`, updates the button label (`2D` while
  in 3D), and resizes the newly visible renderer.

### Status text

- Game over: `Game over — Black|White by N` and
  `B <black> : <white+komi> W (komi <komi>)`, using Chinese area scoring.
- Playing: `Black to play` (empty board) or `<side> to play · move <n+1>`.
- Evaluation: `Even` or `B +X` / `W +X`, then `<win>% B`, then
  `· padded 19x19 net` for 9×9/13×13 fallback.

## 5. Rules engine (`src/game/Goban.ts`)

### Types and state

- `EMPTY = 0`, `BLACK = 1`, `WHITE = 2`.
- `Goban` stores `board: Uint8Array(size*size)`, `side`, `ko`, `komi`,
  `moves: MoveRecord[]`, and `lastMove`.
- `MoveRecord` has `{ color, move: number|null, weight?: number }`; `null` means
  pass.
- `Snapshot` stores board, side, ko, and last move for undo.

### Legality and capture

- `legal(index)` rejects out-of-range, occupied, and ko points.
- It simulates the move on a copy, removes adjacent enemy groups with no
  liberties, then requires the played group to have at least one liberty
  (suicide prevention).
- `play(index)` snapshots, places the stone, removes captured groups, and sets
  `ko` when exactly one stone was captured and the played group has exactly one
  liberty (simple ko).
- Passes clear `ko` and `lastMove`, then switch side.
- There is **no superko**, no multi-stone suicide, and no Japanese-rules
  handling.

### Scoring

`score()` implements Chinese area scoring:

- Count stones for both colors.
- Flood-fill every empty region; if it touches only Black, add it to Black; if
  only White, add it to White; regions touching both are neutral.
- Add komi to White.
- `winner` is `BLACK`, `WHITE`, or `0` for a draw; `margin` is the absolute
  difference.

Note that `ScoreResult.white` already includes komi.

### Undo

Each mutation pushes a snapshot. `undo()` restores the latest snapshot and pops
the move record. `reset()` clears the board, history, ko, and snapshots.

### SGF

`toSGF()` writes:

```
(;GM[1]FF[4]CA[UTF-8]AP[GoGame3D:0.1]SZ[19]KM[7.5]RU[Chinese];B[..];W[..])
```

Passes are written as `B[]` / `W[]`. Coordinates are `a`-`s` for 19×19.

`loadSGF(sgf)` resets the board, validates `SZ` against the current `Goban`
size, reads `KM`, and replays `;B[..]` / `;W[..]` moves. Out-of-turn and
out-of-range moves are skipped rather than corrupting state. `GameController`
creates a new `Goban` when the SGF size differs, and lets the AI move if the
loaded position is White to play. Trailing passes do **not** set `gameOver` on
load today.

### Board size helpers (`BoardSize.ts`)

- `BoardSize = 9 | 13 | 19`.
- `DEFAULT_KOMI = { 9: 7, 13: 7, 19: 7.5 }`.
- `starPoints(size)` uses offsets:
  - 9×9: `[2, 4, 6]`
  - 13×13: `[3, 6, 9]`
  - 19×19: `[3, 9, 15]`
- `neighbors(index, size)` returns orthogonal neighbors with edge checks.

## 6. KataGo TensorFlow.js pipeline

### Model artifacts

```
public/models/dan-19x19/   ~12 MB (3 shards)
public/models/kyu-19x19/   ~4.1 MB (1 shard)
```

Both include `model.json`, weight shards, and `metadata.json` (`{"version":8}`).
Sources are listed in `scripts/models.config.json`:

- dan: `kata1-b10c128` converted to TF.js
- kyu: `kata1-b6c96` converted to TF.js

Optional small-board sources are listed under `rawNetworks`; they require an
offline fixed-size conversion before the app can load them.

### Registry and probing (`registry.ts`)

- `baseUrl()` reads `import.meta.env.BASE_URL`, defaulting to `./`, and ensures a
  trailing slash.
- `modelUrl(size, level)` returns
  `<base>models/<level>-<size>x<size>/model.json`.
- `rootUrlFor(url)` returns the directory portion.

`KataGoEngine.resolve(size, level)`:

- 19×19 → use the 19×19 model directly.
- 9/13 → probe the dedicated URL. If it exists, use it; otherwise use the 19×19
  model with a grid of 19.

The probe is deliberately defensive. Vite's SPA fallback answers missing files
with `index.html` and HTTP 200, so a plain `HEAD` check is not enough:

1. `HEAD` the URL. If not OK, it does not exist.
2. Trust `content-type: application/json` (or a non-HTML type).
3. If the type is HTML or absent, `GET` the payload and require valid JSON with
   `modelTopology` or `weightsManifest`.

If a dedicated model passes the probe but fails to load (bad shard, conversion
error), `evaluate()` logs a warning, switches the cache entry to the 19×19
model, and retries. Failures of the 19×19 model are fatal.

### Backend

`initialize()` tries `tf.setBackend('webgl')`, falls back to `cpu`, then awaits
`tf.ready()`. A `backendReady` flag makes it idempotent. `loadModel()` caches
`tf.GraphModel` instances by URL and de-duplicates concurrent loads.

### Input tensors (`tensor.ts`)

Constants:

- `CHANNELS = 22`
- `GLOBAL_INPUTS = 19`
- `KOMI_INDEX = 5`

`buildInputs(goban, grid)` returns:

- `bin: Float32Array(grid*grid*22)`
- `global: Float32Array(19)`
- `layout: { actual, grid, padded }`

Encoding is always from the perspective of the side to move (`us`), with
`them = opposite(us)`.

Spatial channels:

| Channel | Meaning | Populated |
| --- | --- | --- |
| 0 | On board | 1 inside the actual N×N board |
| 1 | Stones of the side to move | yes |
| 2 | Opponent stones | yes |
| 3 | Stone with 1 liberty | yes (either color) |
| 4 | Stone with 2 liberties | yes (either color) |
| 5 | Stone with 3 liberties | yes (either color) |
| 6 | Ko point | yes |
| 7–8 | Unused | 0 |
| 9 | Last move (opponent first) | yes |
| 10–13 | Moves 2–5 back | yes |
| 14–17 | Ladder features | 0 |
| 18–19 | Area features | 0 |
| 20–21 | Encore-phase stones | 0 |

Liberties are computed per group with `goban.groupAt()`. Channels 3–5 are set for
any stone, not just the side to move, matching the original 2D app's
approximation.

Global inputs:

| Index | Meaning | Value |
| --- | --- | --- |
| 0–4 | Pass flags for the last five moves | 1 for a pass, else 0 |
| 5 | Komi | `(us === WHITE ? komi : -komi) / 20` |
| 6–18 | Ko rule, suicide, scoring, tax, etc. | 0 |

KataGo source confirms that the extra `+1` komi adjustment applies only to
**territory scoring**. This app uses Chinese area scoring, so it is intentionally
not added. The original 2D app added it despite claiming Chinese rules; that is
not reproduced here.

Last-move encoding walks the history backwards. `expected` starts as the
opponent (because the side to move is about to play). A pass sets the
corresponding global flag; a move of the expected color sets the matching spatial
channel. The expected color flips each step, up to five moves.

### Padding and slicing

For 9×9/13×13 padded inference:

- The actual board is written at rows/columns `0..N-1` of the 19×19 grid.
- Channel 0 is 1 only on the real board, so the model can distinguish the
  remainder.
- Policy: the first `grid*grid + 1` values are a full 19×19 policy plus pass at
  index `grid*grid`; after softmax, `extractPolicy()` keeps the top-left N×N
  points and copies the full-grid pass to `n*n`.
- Ownership: `extractOwnership()` keeps the top-left N×N points.
- The layout's `padded` flag drives the status suffix.

### Policy semantics

The bundled models expose a policy head shaped `[1, 2, grid²+1]`. Head 0 is the
policy for the side to move; head 1 is not used. Values are **masked logits**:
illegal and off-board points sit near `-5000`, legal points are raw scores.
`softmaxPolicy()` subtracts the max, exponentiates, and normalizes, so the
`Evaluation.policy` contract ("probabilities") is true. This also means
`chooseMove()` can rank by probability directly, and off-board underflow becomes
exactly zero.

### Ownership, score lead, and win rate

After slicing:

- Ownership is converted to the Black perspective:
  `blackOwnership = side === BLACK ? raw : -raw`. Positive means Black.
  This sign convention was verified empirically against the bundled models.
- Score lead: `scoreToMove = miscvalues[2] * 20`; `scoreLead = side === BLACK ?
  scoreToMove : -scoreToMove`. Positive means Black leads.
- Win rate: `value_output` is three logits `[win, loss, draw]` for the side to
  move. Softmax them, and set:
  - Black to move → `P(black win) = win`
  - White to move → `P(black win) = loss`
  Clamp to `[0, 1]`. Missing value output defaults to 0.5.

Outputs are located by substring in `model.outputNodes`, because the two models
order them differently:

```
swa_model/value_output          [1, 3]
swa_model/miscvalues_output     [1, 10]
swa_model/ownership_output      [1, 19, 19]
swa_model/policy_output         [1, 2, 362]
```

All output tensors are disposed after copying their data.

### Move selection (`src/ai/select.ts`)

`chooseMove(goban, level)` evaluates once and delegates to `selectMove()`:

1. Collect indices with `policy[i] > 0` (after softmax, this excludes off-board
   points that underflowed to zero and includes low-probability legal moves).
2. Sort descending by probability.
3. Compare the pass probability `policy[n*n]` with the highest policy board
   entry. If pass is strictly larger (and non-zero), return `null` so the
   controller passes.
   This lets the AI pass back in settled positions instead of filling its own
   territory forever.
4. While `goban.moveNumber <= 6`, shuffle the top three board candidates to
   vary openings.
5. Return the first candidate for which `goban.legal(i)` is true.
6. If none are legal, return any legal move.
7. If the board is full, return `null`.

There is no tree search or visit distribution. The pass decision is purely the
policy head; a bare net can occasionally pass earlier or later than a search
engine would.

## 7. Rendering

### Board3D (`src/ui/Board3D.ts`)

Scene:

- `Engine(canvas, true, { stencil: true, preserveDrawingBuffer: true }, true)`
- `ArcRotateCamera` at `alpha = π/2`, `beta = 0.82`, `radius = 26`; radius limits
  scale with board size (`max(13, N*1.65)` by default); panning disabled.
- Hemispheric + directional lights.
- Materials: wood board, dark star points, glossy black stones/pieces, warm
  white pieces.
- Chess pieces are loaded once from `assets/chess/{pawn,knight,bishop,rook,queen,king}.glb`
  via `SceneLoader.LoadAssetContainerAsync` and instantiated per stone with
  `instantiateModelsToScene`.
- If loading fails, `fallback` is set and primitive cylinders/spheres are used.

Board rebuild (`setBoardSize`):

- Disposes board nodes and pieces, then rebuilds:
  - board box (`width/depth = N + 0.9`, height 0.4, y = -0.2)
  - grid line system at y = 0.012
  - star discs at y = 0.02
  - 1024×1024 `DynamicTexture` heat plane at y = 0.024, double-sided,
    alpha-blended
- World spacing is 1 unit; the board center is the origin.

Heat:

- For each intersection, draw a circle of radius `0.42 * cell` at the cell
  center with `heatColor(ownership)`.
- The texture is cleared and updated every render.

Pieces:

- `syncPieces` reconciles the board with a
  `Map<index, {root, rank, color, dead}>`.
- New or changed pieces are recreated at
  `(col - (N-1)/2, 0.03, row - (N-1)/2)`.
- New pieces fly in as a go stone from off-board and are replaced by the
  evaluated piece when they land.
- Captured stones are disposed.

Rank mapping (`src/ui/pieceRank.ts`):

```
own = color === BLACK ? ownership : -ownership
dead = own < 0

if lastMove && !dead: rank = 5                 (king)
else if dead:         small cube (3D chess styles) / small square (2D);
                      a normal stone in the traditional stones style
else:
  own >= 0.75 -> 5 king
  own >= 0.61 -> 4 queen
  own >= 0.50 -> 3 rook
  own >= 0.43 -> 2 bishop
  own >= 0.31 -> 1 knight
  otherwise   -> 0 pawn
```

The ownership is **color-relative**: a White stone is strong when the raw
ownership is negative (White influence). This avoids promoting a dead Black
stone just because the point has a strong White ownership magnitude.

Dead stones are not removed from `Goban`, because they have not been captured
and the app has no dead-stone-marking phase. They remain on the board as small
cubes (3D) or small squares (2D). This is a visual estimate only;
`Goban.score()` still counts those stones. A real game would require both players to agree on dead stones before
scoring (or the app would need an explicit dead-stone phase).

Piece normalization:

- The instantiated root is scaled so its largest bounding-box dimension is 0.72.
- It is centered in X/Z and its minimum Y is placed at 0.
- Meshes use the black or white material and are not pickable.

Picking:

- `pointerdown` records position/time; `pointerup` accepts a click if movement
  is ≤ 10 px and duration ≤ 800 ms.
- `scene.pick` is restricted to the board mesh.
- The picked point is converted to column/row by rounding
  `point.x + (N-1)/2` and `point.z + (N-1)/2` (spacing 1).
- Points more than half a cell from an intersection are rejected.

### Board2D (`src/ui/Board2D.ts`)

- Canvas 2D with device-pixel-ratio scaling.
- Board extent is 92% of the smaller parent dimension, with a wooden background,
  grid, star points, ownership heat circles, stones with radial gradients, and a
  last-move marker.
- Dead stones are drawn as small squares, matching the 3D cubes.
- Click handling uses `offsetX/offsetY` and the same half-cell tolerance.
- `resize()` re-renders; the controller calls it when switching views.

### Heat colors (`src/ui/heatmap.ts`)

`heatColor(value)` clamps to `[-1, 1]` and computes:

```
strength = abs(value)
alpha = 0.12 + 0.58 * strength
if value >= 0 (Black influence):
  r = 224 - 40 * (1 - strength)
  g = 96 + 40 * strength
  b = 48
else (White influence):
  r = 56
  g = 128 + 40 * strength
  b = 220
```

`scoreTint(scoreLead)` exists but is not currently used by either renderer.

## 8. Platform integration

### Web / PWA

- `vite.config.ts` sets `base: './'`, `target: 'es2022'`, `outDir: 'dist'`.
- `vite-plugin-pwa`:
  - `registerType: 'autoUpdate'`
  - `injectRegister: false` (registration is in `src/main.ts`)
  - manifest: standalone, theme/background `#1a120b`, `start_url: './'`,
    `scope: './'`, 192/512 icons
  - Workbox glob: `**/*.{js,css,html,png,svg,json,bin,glb}`
  - `maximumFileSizeToCacheInBytes: 32 MB`
- The current build precaches 35 entries, about 23.3 MB, including both models
  and all chess GLBs.
- The service worker is not registered when `window.__ELECTRON__` is true.

### Electron

`electron/main.cjs`:

- Registers a privileged `app` scheme with `standard`, `secure`,
  `supportFetchAPI`, and `stream`.
- In production (`app.isPackaged`) or with `GOGAME_BUNDLE=1`, installs
  `protocol.handle('app', ...)`:
  - maps `app://bundle/<path>` to `<project>/dist/<path>`
  - rejects path traversal outside `dist/`
  - serves correct MIME types for HTML, JS, CSS, JSON, BIN, GLB, images, WASM,
    fonts
  - supports `HEAD` and returns 404 on missing files
- Loads `app://bundle/index.html` in production; in dev loads
  `http://localhost:5173` and opens detached DevTools.
- `GOGAME_DEBUG=1` appends `?debug=1`, exposing `window.__game`.
- Window: 1280×920, minimum 480×480, dark background, context isolation on,
  node integration off.
- `electron/preload.cjs` exposes `window.__ELECTRON__ = true` with
  `contextBridge`.

`electron-builder` config in `package.json`:

- `appId`: `com.gogame3d.app`
- `productName`: `GoGame3D`
- output: `release/`
- files: `dist/**/*`, `electron/**/*`, `package.json`
- targets: NSIS (Windows), DMG (macOS), AppImage (Linux)

`release/` is gitignored. `GOGAME_BUNDLE=1` is the quick way to exercise the
production `app://` path without packaging.

### GitHub Pages

`.github/workflows/deploy.yml` runs on pushes to `main` and manual dispatch:

1. checkout, Node 20, `npm ci`
2. `npm run test`
3. `npm run build`
4. `configure-pages`, upload `dist/` as the Pages artifact
5. `deploy-pages`

Because the base is relative, project sites such as
`https://user.github.io/repo/` work without configuration.

## 9. Assets and tooling

### Models

`npm run fetch:models` reads `scripts/models.config.json` and, for each source:

- skips the model if `model.json` already exists
- downloads `model.json`
- downloads every shard referenced by `weightsManifest`
- downloads `metadata.json` if available

The optional `rawNetworks` entries are documentation only; they require offline
conversion to fixed-size TF.js graph models. Expected locations:

```
public/models/dan-9x9/model.json
public/models/kyu-9x9/model.json
public/models/dan-13x13/model.json
public/models/kyu-13x13/model.json
```

The app probes these and prefers them over padded inference. If a dedicated
model is broken, the engine falls back to 19×19 at runtime.

### Chess pieces

`npm run convert:fbx`:

- Input: `Dark_Yagami/3D Chess Pack - Free/Models/{Pawn,Knight,Bishop,Rook,Queen,King}.fbx`
- Output: `public/assets/chess/{pawn,knight,bishop,rook,queen,king}.glb`
- Converter: `C:/Users/bluen/.local/bin/FBX2glTF-windows-x64.exe` by default;
  override with `FBX2GLTF`.
- Command: `FBX2glTF --binary --input <fbx> --output <path-without-suffix>`

Sizes are roughly 30–83 KB per GLB. `king.glb` is used for the king rank.

## 10. Testing and verification

### Automated

- `npx tsc --noEmit` — clean.
- `npm test` — 20 unit tests pass (6 rules + 5 tensor + 4 move selection + 5
  rank mapping), 1 integration test skipped.
- `RUN_MODEL_TESTS=1 npx vitest run tests/models.integration.test.ts` — passes in
  about 1.7 s on CPU. It loads the kyu 19×19 model from a temporary local HTTP
  server and checks padded inference for 9, 13, and 19:
  - two input nodes
  - policy/ownership output names found
  - sliced policy length `N²+1`, ownership length `N²`
  - finite values
  - policy probabilities sum to 1 after softmax
- The GitHub Actions workflow runs `npm test` and `npm run build` before
  deploying.

### Manual smoke tests performed

Browser/preview and Electron were exercised with temporary automation scripts
(not committed). The checks:

- Boot overlay hides after model load.
- Empty-board evaluation renders (score/win rate visible).
- A human center move is followed by an AI move: 2 moves, 2 pieces, side back to
  Black.
- 9×9 and 13×13 switch correctly, report `padded 19x19 net`, and produce
  `ownership.length = N²` and `policy.length = N²+1`.
- Undo removes both plies and clears the board.
- 2D/3D toggling hides the correct canvas.
- A settled 9×9 split position (Black left, White right, empty middle column):
  human pass → AI pass → `gameOver` is set with two consecutive passes, 72
  pieces remain, and the score reads `B 36.0 : 43.0 W (komi 7)`, White by 7.
- Production Electron over `app://bundle/index.html` loads models and GLBs,
  sets `window.__ELECTRON__`, and plays an AI response.

Headless WebGL2 was available in Electron, but visual look-and-feel (camera,
lighting, piece proportions) still needs a human pass.

### Build output

- Main JS bundle: about 6.9 MB (Babylon + TF.js + app).
- `dist/`: about 23 MB including models and GLBs.
- PWA precache: 35 entries, about 23 MB.

## 11. Known limitations and TODOs

### Rules

- Simple ko only; no positional/situational superko.
- Suicide is always illegal.
- Chinese area scoring only; no Japanese territory scoring, seki handling,
  dead-stone marking, or handicap.
- SGF loader skips malformed moves and does not restore `gameOver` from trailing
  passes.
- No player color choice (human is always Black), no handicap stones.

### AI

- Bare policy/value net; no MCTS or visit distribution.
- Ladder channels 14–17 and area channels 18–19 are zero; tactical strength is
  lower than full KataGo.
- Global rule channels 6–18 are zero except komi; simple ko/area/no-suicide is
  the intended interpretation.
- 9×9/13×13 use padded 19×19 inference; dedicated small-board models would be
  stronger and cheaper.
- The model probe downloads `model.json` only when the HEAD content type is
  ambiguous; on servers that report JSON correctly it avoids the extra GET.
- Policy/score/winrate conventions are validated for the bundled models; other
  conversions may differ.
- Pass is decided purely by the policy head; the bare net can pass earlier or
  later than a search engine would.

### UI

- Dead stones are small cubes but not removed or excluded from scoring. A proper
  finish would need a dead-stone-marking phase or an agreed removal step before
  final scoring.
- No captured-stone tray, move list, sound, or score-estimate graph.
- `scoreTint()` is unused.
- No i18n or accessibility audit.
- Service-worker updates apply on a later reload; the first load after a deploy
  may still run the previous bundle.

### Performance

- The first visit downloads/precaches about 23 MB.
- WebGL is preferred; CPU fallback works but is slower.
- Both models are precached even though only one level is used at a time. Lazy
  caching by level would reduce the initial payload.

## 12. Appendix: exact model I/O and formulas

### Model I/O

```
bin_inputs      [1, 361, 22]   float32
global_inputs   [1, 19]        float32

value_output       [1, 3]
miscvalues_output  [1, 10]     index 2 = lead (side to move)
ownership_output   [1, 19, 19] positive = side to move
policy_output      [1, 2, 362] head 0 = policy logits, pass at 361
```

Input node keys are taken from `model.inputNodes[0]` and `[1]` rather than
hard-coded, so either conversion's naming works.

### Key formulas

```
selfKomi        = (side === WHITE ? komi : -komi) / 20
scoreLeadBlack  = (side === BLACK ? 1 : -1) * miscvalues[2] * 20
winrateBlack    = side === BLACK
                    ? softmax(value)[0]
                    : softmax(value)[1]
ownershipBlack  = side === BLACK ? rawOwnership : -rawOwnership
rank            = clamp(floor((0.55*min(1,|ownership|) +
                               0.45*min(1,moveWeight/0.45)) * 5), 0, 4)
alphaHeat       = 0.12 + 0.58 * |ownership|
```

### Example SGF

```
(;GM[1]FF[4]CA[UTF-8]AP[GoGame3D:0.1]SZ[9]KM[7]RU[Chinese];B[ee];W[cc];B[])
```

### Debug hook

Append `?debug=1` (or run the Vite dev server) to expose `window.__game`. Private
methods are reachable at runtime, which is how the smoke tests drove
`humanPlay`, `undo`, and board-size changes:

```js
const g = window.__game;
await g.humanPlay(40);
g.goban.moves.length; // 2 after the AI reply
g.board3d.pieceCount; // 2
```
