# Visual Baseline

Founder reference runtime:

```text
http://127.0.0.1:5173/experiments/world-color-integration-v1/?preview=latest-sunset-core
```

Frozen visual contract:

- Earth, Landscape, Ocean, Civilization and World Color unchanged.
- Cloud V2, Atmosphere V2 and Aurora V7 unchanged.
- Camera and render budgets unchanged.
- WGS84 Life Photo projection unchanged.
- Core is one `.life-thumb` enlarged at its geographic anchor.
- `CORE_SWITCH_DELAY_MS=900`; `CORE_TRANSITION_MS=1050`.
- 4:5 photos, single warm-gold border, warm glow and no leader line.
- No `left`/`top` transition.

Evidence:

- `evidence/founder-mobile-390x844.png`
- `evidence/founder-desktop-1280x720.png`

Runtime checks confirmed 159 photos, one Core, zero failed images and matching
computed Core CSS. Animated aurora/cloud frames are time-dependent; code,
shader and parameter equality is the authoritative animation baseline.
