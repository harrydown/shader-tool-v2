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

## ASCII Characters minimal
Actual ASCII character patterns rendered in a 5×5 grid with 8 distinct brightness levels

- **Level 1** (< 0.125): `.` (dot) - single center pixel
- **Level 2** (0.125 - 0.25): `:` (colon) - two vertical dots
- **Level 3** (0.25 - 0.375): `-` (dash) - horizontal line
- **Level 4** (0.375 - 0.5): `+` (plus) - horizontal and vertical cross
- **Level 5** (0.5 - 0.625): `*` (asterisk) - plus with diagonals
- **Level 6** (0.625 - 0.75): `#` (hash) - grid pattern
- **Level 7** (0.75 - 0.875): `%` (percent) - diagonal line with dots
- **Level 8** (≥ 0.875): `@` (at symbol) - circular ring with center detail

Uses pixel-perfect patterns within each cell to approximate Courier New-style monospace ASCII characters. Each character is designed to be recognizable in the 5×5 grid while maintaining clear visual progression from dark to bright. All levels use actual character patterns - no full blocks.

## ASCII Characters normal
Comprehensive ASCII character set with 16 distinct brightness levels for fine-grained shading

- **Level 1** (< 0.0625): `` ` `` (backtick) - tiny top dot
- **Level 2** (0.0625 - 0.125): `.` (dot) - center pixel
- **Level 3** (0.125 - 0.1875): `,` (comma) - dot with tail
- **Level 4** (0.1875 - 0.25): `-` (dash) - horizontal line
- **Level 5** (0.25 - 0.3125): `:` (colon) - two vertical dots
- **Level 6** (0.3125 - 0.375): `;` (semicolon) - colon with tail
- **Level 7** (0.375 - 0.4375): `i` (letter i) - vertical line with dot
- **Level 8** (0.4375 - 0.5): `|` (pipe) - full vertical line
- **Level 9** (0.5 - 0.5625): `+` (plus) - cross
- **Level 10** (0.5625 - 0.625): `=` (equals) - double horizontal lines
- **Level 11** (0.625 - 0.6875): `*` (asterisk) - 8-way pattern
- **Level 12** (0.6875 - 0.75): `#` (hash) - grid pattern
- **Level 13** (0.75 - 0.8125): `%` (percent) - diagonal with dots
- **Level 14** (0.8125 - 0.875): `&` (ampersand) - S-curve pattern
- **Level 15** (0.875 - 0.9375): `@` (at symbol) - ring with detail
- **Level 16** (≥ 0.9375): `M` (letter M) - complex letter form

Provides the most granular ASCII shading with 16 distinct characters, enabling smooth tonal gradations and detailed rendering. Classic ASCII art character progression optimized for visual density and recognizability.
