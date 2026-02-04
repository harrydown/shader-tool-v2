# ASCII Shader Styles

This document describes the different ASCII rendering styles available in the application.

## Standard
Grid-based pattern with progressive filling

- **Darkest** (< 0.2): Single pixel in center
- **Low** (0.2 - 0.35): 2×2 center block
- **Mid-low** (0.35 - 0.5): Horizontal bands through middle
- **Mid-high** (0.5 - 0.65): Horizontal bands with edges
- **High** (0.65 - 0.8): Cross pattern with partial fill
- **Brightest** (≥ 0.8): Full cell

## Dense
Fine gradations with more detail and intermediate opacity values

- **Level 1** (< 0.15): Single pixel with 20% opacity
- **Level 2** (0.15 - 0.25): Diagonal pixels with 40% opacity
- **Level 3** (0.25 - 0.35): 2×2 center block with 60% opacity
- **Level 4** (0.35 - 0.45): Vertical center strip with 70% opacity
- **Level 5** (0.45 - 0.55): Horizontal bands with 80% opacity and partial background
- **Level 6** (0.55 - 0.65): Most pixels filled with 85% opacity
- **Level 7** (0.65 - 0.75): Edge pixels at full opacity, interior at 60%
- **Level 8** (0.75 - 0.85): Almost full with corner pixels at 50%
- **Brightest** (≥ 0.85): Full cell

Creates smoother tonal gradients with overlapping patterns.

## Minimal
Sparse, high contrast with larger empty areas

- **Darkest** (< 0.25): Completely empty
- **Low** (0.25 - 0.4): Single center pixel with 50% opacity
- **Mid-low** (0.4 - 0.55): Two center pixels with 70% opacity
- **Mid-high** (0.55 - 0.7): Vertical center strip with 85% opacity
- **High** (0.7 - 0.85): Horizontal bands at full opacity
- **Brightest** (≥ 0.85): Full cell

## Blocks
7 horizontal bands that progressively fill from top

Uses line-based rendering instead of grid. Creates a venetian blind or scan line effect.

- **Band 1** (< 0.08): Single line at top with 80% opacity
- **Band 1 cont.** (0.08 - 0.167): Single line at top at full opacity
- **Band 2** (0.167 - 0.25): Two lines (top two bands)
- **Band 3** (0.25 - 0.33): Three lines (top three bands)
- **Band 4** (0.33 - 0.45): Four lines (top four bands)
- **Band 5** (0.45 - 0.58): Five lines (top five bands)
- **Band 6** (0.58 - 0.72): Six lines (top six bands)
- **Band 7** (≥ 0.72): Fully filled (all seven bands)

## Standard - Dots
Circular patterns that grow with brightness

- **Darkest** (< 0.2): Small faint dot in center (30% opacity)
- **Low** (0.2 - 0.35): Medium dot
- **Mid-low** (0.35 - 0.5): Larger dot
- **Mid-high** (0.5 - 0.65): Even larger dot with soft edge
- **High** (0.65 - 0.8): Large dot covering most of cell
- **Brightest** (≥ 0.8): Full cell

Uses distance from center to create circular shapes instead of grid-based patterns.

## Melding Dots
Organic blob effect where adjacent dots connect and meld together at higher brightness levels. All shapes remain circular with soft, blurred edges.

- **Darkest** (< 0.2): Small isolated dot with blur (30% opacity)
- **Low** (0.2 - 0.35): Medium dot with soft edge
- **Mid-low** (0.35 - 0.5): Larger blurred circle
- **Mid-high** (0.5 - 0.65): Large circle extending beyond cell boundaries - melding begins
- **High** (0.65 - 0.8): Very large circle - strong melding across cells
- **Brightest** (≥ 0.8): Maximum size circle - complete melding

Creates metaball-like effects where circular shapes merge and form organic, connected patterns when brightness is high enough. Uses smoothstep for natural blur and soft edges. Small dots remain separate, large dots overlap and flow together while maintaining circular forms.
