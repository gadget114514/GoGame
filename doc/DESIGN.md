# GoGame 3D — Design Overview

This document is the short architectural overview. The implementation-level
reference (APIs, tensor layout, platform details, test commands, and known gaps)
lives in [`DESIGN-detail.md`](./DESIGN-detail.md).

## Goals

- A playable Go game that runs unchanged on **GitHub Pages** (PWA) and as an
  **Electron** desktop application.
- Board sizes **9×9, 13×13, and 19×19**.
- AI from **KataGo** neural networks converted to **TensorFlow.js**, with no
  server component and no native binaries at runtime.
- Stones rendered as **Dark_Yagami chess pieces** on a 3D board, ranked from
  pawn to king by the network's ownership/weight estimate.
- The board surface is **colorized by predicted ownership**, so territory and
  influence are visible while playing.

## Non-goals

- Full rules coverage (Japanese rules, superko, handicap, dead-stone marking).
- Strong search. The app uses the bare policy/value network, not MCTS.
- Training or converting models in the browser. Conversion is an offline task.

## System context

```
Browser (GitHub Pages / PWA)          Electron (Windows/macOS/Linux)
        |                                      |
        |  static files (relative base)        |  app:// protocol -> dist/
        v                                      v
+-----------------------------------------------------------+
|                     Vite-built SPA                        |
|  index.html + src/main.ts + src/style.css                 |
|                                                           |
|  GameController  ------  Goban (rules, scoring, SGF)      |
|      |      |                                             |
|      |      +---- Board2D (Canvas fallback)               |
|      +----------- Board3D (Babylon.js)                    |
|      |                  |                                 |
|      |                  +-- GLB chess pieces              |
|      |                  +-- ownership heat texture        |
|      |                                                    |
|      +----------- KataGoEngine (TensorFlow.js)            |
|                         |                                 |
|                         +-- public/models/{dan,kyu}-19x19 |
+-----------------------------------------------------------+
```

## Key decisions

### 1. Bare network, no search

`KataGoEngine.chooseMove()` runs one forward pass and ranks legal points by the
policy head; it passes when the policy's pass entry beats the best board move.
This keeps the app small and fast enough for mobile browsers. The tradeoff is
tactical weakness: the network can misread ladders and fights, as the original
2D app also documented.

### 2. One 19×19 network for all board sizes

Only 19×19 TF.js models are bundled. For 9×9 and 13×13, the board is written into
the top-left corner of a 19×19 input; channel 0 ("on board") is zero outside the
real board. Policy and ownership outputs are sliced back to the real size.

The model registry still prefers dedicated `public/models/{dan,kyu}-{9,13}x…`
files when they exist, and falls back to the 19×19 net if a dedicated model is
missing or fails to load.

### 3. Outputs are mapped by name, not index

The dan and kyu conversions order their output nodes differently. The engine
locates `policy_output`, `ownership_output`, `miscvalues_output`, and
`value_output` by name substring.

### 4. Model semantics

- **Policy** is `[1, 2, grid²+1]` masked logits. Head 0 is used; illegal and
  off-board points are near `-5000`. A softmax converts head 0 to probabilities.
- **Ownership** is from the perspective of the player to move (empirically
  verified for the bundled models). It is flipped when White is to move so the
  rest of the app always sees "positive = Black".
- **Score lead** is `miscvalues[2] * 20`, also from the side-to-move
  perspective; it is negated for White.
- **Win rate** comes from a softmax over the three `value_output` logits
  (win/loss/draw for the side to move), converted to Black's win probability.

### 5. Chess rank is a visual encoding, not a game rule

Each stone is one of six meshes (`pawn`, `knight`, `bishop`, `rook`, `queen`,
`king`). Rank comes from the ownership at the stone's point, measured from that
stone's own color perspective (`own = color === Black ? ownership : -ownership`):

- `own < 0`: the network expects the stone to be dead → small cube (chess-piece
  styles) or a normal stone (traditional stones style).
- `own >= 0.31 / 0.43 / 0.50 / 0.61 / 0.75`: knight / bishop / rook / queen / king.
- `0 <= own < 0.31`: pawn.

A live last move is promoted to king as a visual accent; a dead last move is
not promoted. The policy weight is still recorded on moves but no longer affects
rank.

### 6. Relative base and an app:// protocol

Vite uses `base: './'`, so one build works at a GitHub Pages project subpath and
under Electron. In production Electron serves `dist/` through a privileged
`app://` protocol (registered with `supportFetchAPI`), which makes relative
module, GLB, and model fetches work without a local HTTP server. The service
worker is disabled inside Electron.

### 7. Caching

The PWA precaches the shell, models, and chess GLBs (~23 MB) on first visit.
`registerType: 'autoUpdate'` updates the cache in the background; a reload is
still needed to run the new bundle.

## Runtime flow

1. `src/main.ts` registers the service worker (web only), constructs
   `GameController`, and starts it.
2. `GameController.start()` initializes TensorFlow.js (WebGL, then CPU fallback)
   and evaluates the empty board. The boot overlay is hidden in `finally`.
3. A click on an intersection calls `humanPlay()`. The human is always Black.
4. After a legal human move, `aiTurn()` evaluates the position, chooses the
   highest-probability legal move (or passes if pass wins the policy), plays it,
   and evaluates again for display.
5. `render()` updates the 3D scene (and the 2D canvas when visible): ownership
   heat, stones, ranks, last-move marker.
6. Undo removes up to two plies so that Black is to move again. Pass, Eval, SGF
   save/load, board-size changes, komi changes, AI level changes, and the 2D/3D
   toggle are wired in `GameController`.

## Rules and scoring

`Goban` is board-size agnostic and implements:

- alternating turns, passes, simple ko, suicide prevention, capture by
  flood-fill of liberties;
- undo via snapshots;
- **Chinese area scoring**: stones plus empty regions touching only one color,
  with komi added to White;
- SGF save/load (`GM[1]FF[4]`, `SZ`, `KM`, `RU[Chinese]`, `B[]`/`W[]` passes).

Defaults: komi 7.0 for 9×9 and 13×13, 7.5 for 19×19. Human Black, AI White.

## Known limitations

- No MCTS; ladder/area input channels are currently zero, so tactical strength
  is below the full KataGo feature set.
- Simple ko only; no superko, Japanese rules, handicap, or dead-stone marking.
- 9×9/13×13 use padded 19×19 inference. Dedicated models would be faster and
  stronger.
- SGF loading does not reconstruct game-over state from trailing passes.
- The king mesh is unused; there is no captured-stone tray or sound.
- Headless verification covered build, model inference, AI moves, and the
  Electron `app://` path; visual look-and-feel still needs a human pass.

## Where to go next

- Add dedicated 9×9/13×13 TF.js models (see `scripts/models.config.json`).
- Implement KataGo's ladder features (channels 14–17) and area features
  (18–19).
- Consider a small MCTS or KataGo analysis-engine integration for stronger play.
- Extend rules/SGF coverage and scoring UI.

See [`DESIGN-detail.md`](./DESIGN-detail.md) for file-by-file details and exact
formulas.
