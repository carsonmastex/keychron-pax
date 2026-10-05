# Keychron Dash · PAX Aus 2026

Booth game for Keychron × PAX Aus 2026 (MCEC Melbourne, 9-11 Oct 2026).
Race through Melbourne to PAX: jump cones, barriers, puddles and box stacks,
slide under signs, banners and drones, collect switches, and spell
K-E-Y-C-H-R-O-N for a keyboard bonus.

Play: https://carsonmastex.github.io/keychron-pax/

Based on Pizza Dash (Domino's × Keychron) by the Mastex Taiwan team.

## Controls

| Key | Action |
| --- | --- |
| Enter | Start / save score / play again |
| Space or ↑ | Jump |
| ↓ (hold) | Slide |
| ← → | Move |
| P | Pause |
| F | Full screen |
| ` | Show FPS meter (or open the page with `#fps`) |

## Leaderboard

- On GitHub Pages, scores are saved in that computer's browser only, so each
  computer has its own leaderboard.
- The Claude artifact version stores scores in Claude, so every signed-in
  computer shares one leaderboard.
- Staff reset (GitHub Pages): press **Ctrl+Shift+Backspace** twice within
  3 seconds to clear this computer's leaderboard.

## Build

```bash
npm install
npm run build
```

This writes `index.html` (GitHub Pages) and `dist/claude-artifact.html`
(Claude artifact). Commit `index.html` to update the live site.

Difficulty settings are the constants at the top of `src/Game.tsx`.
