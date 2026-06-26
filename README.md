# 3D Portfolio

A cartoon, flat-shaded first-person desk scene built with **React + Three.js
(react-three-fiber)** and **Rapier** physics. The monitor shows a real,
scrollable portfolio page; desk props are draggable and play material-specific
tap sounds; the glass pencil cup shatters into shards when something heavy slams
into it.

## Run locally

```bash
npm install
npm run dev
```

Then open the printed URL (default http://localhost:5173/portfolio/). The dev
server is also exposed on your LAN, so you can open it on a phone using your
machine's IP (e.g. `http://192.168.x.x:5173/portfolio/`) to test touch
interactions.

> **Windows PowerShell note:** if you see `npm.ps1 cannot be loaded because
> running scripts is disabled`, either run
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, or invoke the
> shim directly: `& "$env:ProgramFiles\nodejs\npm.cmd" run dev`.

## Build & preview a production bundle

```bash
npm run build
npm run preview
```

## Deploy to GitHub Pages

Two options:

1. **GitHub Actions (recommended).** Push to `main`; the workflow in
   `.github/workflows/deploy.yml` builds with the correct base path and
   publishes. Enable Pages → "Build and deployment" → Source: **GitHub Actions**.
2. **Manual.** Set `homepage` in `package.json`, then run `npm run deploy`
   (uses the `gh-pages` package to publish `dist/` to the `gh-pages` branch).

> The Vite `base` path must match your repo name. The CI workflow sets it
> automatically via `BASE_PATH`. For local manual deploys, the default in
> `vite.config.ts` is `/portfolio/` — change it if your repo has a different
> name, or use a `/` base for a user/root site or custom domain.

## Where to edit

- **Portfolio copy:** `src/portfolio/Portfolio.tsx` (+ `portfolio.css`).
- **Scene layout / props:** `src/scene/*` (`Desk`, `Monitor`, `PCTower`,
  `Plants`, `PencilCup`, `Keyboard`, `TeddyBear`, `Room`).
- **Colors / style:** `src/scene/palette.ts`.
- **Tap sounds:** `src/interaction/sounds.ts` (synthesized, no audio files).
- **Drag behaviour:** `src/interaction/useDraggable.ts`.

## Controls

- **Scroll the monitor** to read the portfolio (mouse wheel / touch drag).
- **Drag** the PC tower, plants, keyboard, teddy bear, or pencil cup to move them.
- **Tap** objects for a material-specific sound.
- **Shatter the pencil cup** by knocking a heavy prop (like the PC tower) into
  it hard enough — it bursts into glass shards.
- Mute/unmute with the button in the top-right.

## Performance notes

Particle count and DPR scale down automatically on touch/small-screen devices.
If you need more headroom on low-end phones, reduce the shadow map size in
`src/scene/Lighting.tsx`.
