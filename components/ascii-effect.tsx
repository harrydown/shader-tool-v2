"use client"

import { forwardRef, useMemo, useRef } from "react"
import { Effect, BlendFunction } from "postprocessing"
import { Uniform, Vector2 } from "three"

const fragmentShader = `
// Basic uniforms
uniform float cellSize;
uniform float cellSpacing;
uniform bool invert;
uniform bool colorMode;
uniform int asciiStyle;
uniform float blurAmount;
uniform float minSize;
uniform float maxSize;

// PostFX uniforms
uniform float time;
uniform vec2 resolution;
uniform vec2 mousePos;
uniform float scanlineIntensity;
uniform float scanlineCount;
uniform float targetFPS;
uniform float jitterIntensity;
uniform float jitterSpeed;
uniform bool mouseGlowEnabled;
uniform float mouseGlowRadius;
uniform float mouseGlowIntensity;
uniform float vignetteIntensity;
uniform float vignetteRadius;
uniform int colorPalette;
uniform float curvature;
uniform float aberrationStrength;
uniform float noiseIntensity;
uniform float noiseScale;
uniform float noiseSpeed;
uniform float waveAmplitude;
uniform float waveFrequency;
uniform float waveSpeed;
uniform float glitchIntensity;
uniform float glitchFrequency;
uniform float brightnessAdjust;
uniform float contrastAdjust;
uniform float saturationAdjust;
uniform vec3 backgroundColor;
uniform float cellDensity;
uniform float randomSeed;
uniform int densityMask;
uniform float gradientMidpoint;
uniform float densityStart;
uniform float densityEnd;
uniform sampler2D densityMaskTexture;
uniform bool hasDensityMaskTexture;
uniform float maskScale;
uniform float maskOffsetX;
uniform float maskOffsetY;
uniform bool makeBlackAlpha;

// Helper functions
float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

vec3 rgb2hsl(vec3 color) {
  float maxC = max(max(color.r, color.g), color.b);
  float minC = min(min(color.r, color.g), color.b);
  float delta = maxC - minC;
  float h = 0.0, s = 0.0, l = (maxC + minC) / 2.0;
  if (delta > 0.0) {
    s = l < 0.5 ? delta / (maxC + minC) : delta / (2.0 - maxC - minC);
    if (maxC == color.r) h = ((color.g - color.b) / delta) + (color.g < color.b ? 6.0 : 0.0);
    else if (maxC == color.g) h = ((color.b - color.r) / delta) + 2.0;
    else h = ((color.r - color.g) / delta) + 4.0;
    h /= 6.0;
  }
  return vec3(h, s, l);
}

vec3 hsl2rgb(vec3 hsl) {
  float h = hsl.x, s = hsl.y, l = hsl.z;
  float c = (1.0 - abs(2.0 * l - 1.0)) * s;
  float x = c * (1.0 - abs(mod(h * 6.0, 2.0) - 1.0));
  float m = l - c / 2.0;
  vec3 rgb;
  if (h < 1.0/6.0) rgb = vec3(c, x, 0.0);
  else if (h < 2.0/6.0) rgb = vec3(x, c, 0.0);
  else if (h < 3.0/6.0) rgb = vec3(0.0, c, x);
  else if (h < 4.0/6.0) rgb = vec3(0.0, x, c);
  else if (h < 5.0/6.0) rgb = vec3(x, 0.0, c);
  else rgb = vec3(c, 0.0, x);
  return rgb + m;
}

vec3 applyColorPalette(vec3 color, int palette) {
  if (palette == 1) { // Green
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    return vec3(0.1, lum * 0.9, 0.1);
  } else if (palette == 2) { // Amber
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    return vec3(lum * 1.0, lum * 0.6, lum * 0.2);
  } else if (palette == 3) { // Cyan
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    return vec3(0.0, lum * 0.8, lum);
  } else if (palette == 4) { // Blue
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    return vec3(0.1, 0.2, lum);
  }
  return color;
}

float getChar(float brightness, vec2 p, int style) {
  vec2 grid = floor(p * 4.0);
  float val = 0.0;
  
  if (style == 0) { // Standard
    if (brightness < 0.2) val = (grid.x == 1.0 && grid.y == 1.0) ? 0.3 : 0.0;
    else if (brightness < 0.35) val = (grid.x == 1.0 || grid.x == 2.0) && (grid.y == 1.0 || grid.y == 2.0) ? 1.0 : 0.0;
    else if (brightness < 0.5) val = (grid.y == 1.0 || grid.y == 2.0) ? 1.0 : 0.0;
    else if (brightness < 0.65) val = (grid.y == 0.0 || grid.y == 3.0) ? 1.0 : (grid.y == 1.0 || grid.y == 2.0) ? 0.5 : 0.0;
    else if (brightness < 0.8) val = (grid.x == 0.0 || grid.x == 2.0 || grid.y == 0.0 || grid.y == 2.0) ? 1.0 : 0.3;
    else val = 1.0;
  }
  else if (style == 1) { // Dense - more detail with finer gradations
    if (brightness < 0.15) val = (grid.x == 2.0 && grid.y == 2.0) ? 0.2 : 0.0;
    else if (brightness < 0.25) val = (grid.x == 1.0 && grid.y == 2.0) || (grid.x == 2.0 && grid.y == 1.0) ? 0.4 : 0.0;
    else if (brightness < 0.35) val = ((grid.x == 1.0 || grid.x == 2.0) && (grid.y == 1.0 || grid.y == 2.0)) ? 0.6 : 0.0;
    else if (brightness < 0.45) val = (grid.x == 1.0 || grid.x == 2.0) ? 0.7 : 0.0;
    else if (brightness < 0.55) val = (grid.y == 1.0 || grid.y == 2.0) ? 0.8 : 0.2;
    else if (brightness < 0.65) val = (grid.x + grid.y) != 0.0 ? 0.85 : 0.3;
    else if (brightness < 0.75) val = (grid.x == 0.0 || grid.x == 3.0 || grid.y == 0.0 || grid.y == 3.0) ? 1.0 : 0.6;
    else if (brightness < 0.85) val = (grid.x == 0.0 && grid.y == 0.0) || (grid.x == 3.0 && grid.y == 3.0) ? 0.5 : 1.0;
    else val = 1.0;
  }
  else if (style == 2) { // Minimal - sparse, high contrast
    if (brightness < 0.25) val = 0.0;
    else if (brightness < 0.4) val = (grid.x == 2.0 && grid.y == 2.0) ? 0.5 : 0.0;
    else if (brightness < 0.55) val = ((grid.x == 1.0 || grid.x == 2.0) && grid.y == 2.0) ? 0.7 : 0.0;
    else if (brightness < 0.7) val = (grid.x == 1.0 || grid.x == 2.0) ? 0.85 : 0.0;
    else if (brightness < 0.85) val = (grid.y == 1.0 || grid.y == 2.0) ? 1.0 : 0.0;
    else val = 1.0;
  }
  else if (style == 3) { // Blocks - 7 horizontal bands within each cell
    // Divide cell into 7 horizontal bands (instead of 4x4 grid)
    float bandY = floor(p.y * 7.0); // 0 = bottom, 6 = top
    
    if (brightness < 0.08) {
      // Band 1: Single line at darkest - highly visible
      val = (bandY == 6.0) ? 0.8 : 0.0;
    }
    else if (brightness < 0.167) {
      // Band 1 continued: Single line at full brightness
      val = (bandY == 6.0) ? 1.0 : 0.0;
    }
    else if (brightness < 0.25) {
      // Band 2: Two lines (bands 5-6)
      val = (bandY >= 5.0) ? 1.0 : 0.0;
    }
    else if (brightness < 0.33) {
      // Band 3: Three lines (bands 4-6)
      val = (bandY >= 4.0) ? 1.0 : 0.0;
    }
    else if (brightness < 0.45) {
      // Band 4: Four lines (bands 3-6)
      val = (bandY >= 3.0) ? 1.0 : 0.0;
    }
    else if (brightness < 0.58) {
      // Band 5: Five lines (bands 2-6)
      val = (bandY >= 2.0) ? 1.0 : 0.0;
    }
    else if (brightness < 0.72) {
      // Band 6: Six lines (bands 1-6)
      val = (bandY >= 1.0) ? 1.0 : 0.0;
    }
    else {
      // Band 7: Fully filled (all 7 bands)
      val = 1.0;
    }
  }
  else if (style == 4) { // Standard - Dots (circular patterns)
    vec2 center = p - 0.5;
    float dist = length(center * 2.0);
    
    // Map brightness to size multiplier range
    float sizeMultiplier = mix(minSize, maxSize, brightness);
    
    if (brightness < 0.2) {
      // Small dot in center
      val = (dist < 0.3 * sizeMultiplier) ? 0.3 : 0.0;
    }
    else if (brightness < 0.35) {
      // Medium dot
      val = (dist < 0.5 * sizeMultiplier) ? 1.0 : 0.0;
    }
    else if (brightness < 0.5) {
      // Larger dot
      val = (dist < 0.7 * sizeMultiplier) ? 1.0 : 0.0;
    }
    else if (brightness < 0.65) {
      // Even larger dot with soft edge
      val = (dist < 0.85 * sizeMultiplier) ? 1.0 : (dist < 1.0 * sizeMultiplier) ? 0.5 : 0.0;
    }
    else if (brightness < 0.8) {
      // Large dot covering most of cell
      val = (dist < 1.0 * sizeMultiplier) ? 1.0 : 0.3;
    }
    else {
      // Full cell
      val = 1.0;
    }
  }
  else if (style == 5) { // Melding Dots (organic connections)
    vec2 center = p - 0.5;
    float dist = length(center * 2.0);
    
    // Map brightness to size multiplier range
    float sizeMultiplier = mix(minSize, maxSize, brightness);
    
    if (brightness < 0.2) {
      // Small isolated dot with blur
      val = smoothstep(0.4 * blurAmount * sizeMultiplier, 0.2 * sizeMultiplier, dist);
      val *= 0.3;
    }
    else if (brightness < 0.35) {
      // Medium dot with soft edge
      val = smoothstep(0.6 * blurAmount * sizeMultiplier, 0.4 * sizeMultiplier, dist);
    }
    else if (brightness < 0.5) {
      // Larger dot with blur
      val = smoothstep(0.9 * blurAmount * sizeMultiplier, 0.7 * sizeMultiplier, dist);
    }
    else if (brightness < 0.65) {
      // Large dot extending beyond cell - melding begins
      val = smoothstep(1.2 * blurAmount * sizeMultiplier, 0.9 * sizeMultiplier, dist);
    }
    else if (brightness < 0.8) {
      // Very large dot - strong melding across cells
      val = smoothstep(1.5 * blurAmount * sizeMultiplier, 1.1 * sizeMultiplier, dist);
    }
    else {
      // Maximum size circle - complete melding
      val = smoothstep(1.8 * blurAmount * sizeMultiplier, 1.3 * sizeMultiplier, dist);
    }
  }
  else if (style == 6) { // ASCII Characters minimal - actual character patterns
    vec2 grid5 = floor(p * 5.0); // 5x5 grid for better character definition
    
    if (brightness < 0.125) {
      // Level 1: . (dot) - center pixel only
      val = (grid5.x == 2.0 && grid5.y == 2.0) ? 1.0 : 0.0;
    }
    else if (brightness < 0.25) {
      // Level 2: : (colon) - two dots vertically
      val = (grid5.x == 2.0 && (grid5.y == 1.0 || grid5.y == 3.0)) ? 1.0 : 0.0;
    }
    else if (brightness < 0.375) {
      // Level 3: - (dash) - horizontal line
      val = (grid5.y == 2.0 && grid5.x >= 1.0 && grid5.x <= 3.0) ? 1.0 : 0.0;
    }
    else if (brightness < 0.5) {
      // Level 4: + (plus sign)
      val = ((grid5.x == 2.0) || (grid5.y == 2.0)) ? 1.0 : 0.0;
    }
    else if (brightness < 0.625) {
      // Level 5: * (asterisk pattern)
      val = ((grid5.x == 2.0) || (grid5.y == 2.0) || (grid5.x == grid5.y) || (grid5.x + grid5.y == 4.0)) ? 1.0 : 0.0;
    }
    else if (brightness < 0.75) {
      // Level 6: # (hash) - grid pattern
      val = ((grid5.x == 1.0 || grid5.x == 3.0) || (grid5.y == 1.0 || grid5.y == 3.0)) ? 1.0 : 0.0;
    }
    else if (brightness < 0.875) {
      // Level 7: % (percent) - diagonal pattern with dots
      val = (grid5.x == grid5.y) ? 1.0 : 0.0;
      if ((grid5.x == 1.0 && grid5.y == 4.0) || (grid5.x == 3.0 && grid5.y == 0.0)) val = 1.0;
    }
    else {
      // Level 8: @ (at symbol) - outer ring with center detail
      float dist5 = length(grid5 - 2.0);
      val = (dist5 > 1.2 && dist5 < 2.2) ? 1.0 : 0.0;
      if (grid5.x >= 2.0 && grid5.y == 2.0) val = 1.0; // inner detail
    }
  }
  else if (style == 7) { // ASCII Characters normal - 16 brightness levels
    vec2 grid5 = floor(p * 5.0);
    
    if (brightness < 0.0625) {
      // Level 1: backtick - tiny dot
      val = (grid5.x == 2.0 && grid5.y == 4.0) ? 1.0 : 0.0;
    }
    else if (brightness < 0.125) {
      // Level 2: . (dot) - center
      val = (grid5.x == 2.0 && grid5.y == 2.0) ? 1.0 : 0.0;
    }
    else if (brightness < 0.1875) {
      // Level 3: , (comma) - center with tail
      val = (grid5.x == 2.0 && (grid5.y == 2.0 || grid5.y == 1.0)) ? 1.0 : 0.0;
    }
    else if (brightness < 0.25) {
      // Level 4: - (dash)
      val = (grid5.y == 2.0 && grid5.x >= 1.0 && grid5.x <= 3.0) ? 1.0 : 0.0;
    }
    else if (brightness < 0.3125) {
      // Level 5: : (colon)
      val = (grid5.x == 2.0 && (grid5.y == 1.0 || grid5.y == 3.0)) ? 1.0 : 0.0;
    }
    else if (brightness < 0.375) {
      // Level 6: ; (semicolon)
      val = (grid5.x == 2.0 && (grid5.y == 1.0 || grid5.y == 3.0 || grid5.y == 4.0)) ? 1.0 : 0.0;
    }
    else if (brightness < 0.4375) {
      // Level 7: i (letter i)
      val = (grid5.x == 2.0 && (grid5.y >= 1.0 && grid5.y <= 3.0)) ? 1.0 : 0.0;
      if (grid5.x == 2.0 && grid5.y == 4.0) val = 1.0;
    }
    else if (brightness < 0.5) {
      // Level 8: | (pipe)
      val = (grid5.x == 2.0) ? 1.0 : 0.0;
    }
    else if (brightness < 0.5625) {
      // Level 9: + (plus)
      val = ((grid5.x == 2.0) || (grid5.y == 2.0)) ? 1.0 : 0.0;
    }
    else if (brightness < 0.625) {
      // Level 10: = (equals)
      val = ((grid5.y == 1.0 || grid5.y == 3.0) && grid5.x >= 1.0 && grid5.x <= 3.0) ? 1.0 : 0.0;
    }
    else if (brightness < 0.6875) {
      // Level 11: * (asterisk)
      val = ((grid5.x == 2.0) || (grid5.y == 2.0) || (grid5.x == grid5.y) || (grid5.x + grid5.y == 4.0)) ? 1.0 : 0.0;
    }
    else if (brightness < 0.75) {
      // Level 12: # (hash)
      val = ((grid5.x == 1.0 || grid5.x == 3.0) || (grid5.y == 1.0 || grid5.y == 3.0)) ? 1.0 : 0.0;
    }
    else if (brightness < 0.8125) {
      // Level 13: % (percent)
      val = (grid5.x == grid5.y) ? 1.0 : 0.0;
      if ((grid5.x == 1.0 && grid5.y == 4.0) || (grid5.x == 3.0 && grid5.y == 0.0)) val = 1.0;
    }
    else if (brightness < 0.875) {
      // Level 14: & (ampersand) - S-curve pattern
      val = (grid5.x + grid5.y == 4.0 || grid5.x == grid5.y) ? 1.0 : 0.0;
      if (grid5.x == 0.0 && grid5.y == 2.0) val = 1.0;
    }
    else if (brightness < 0.9375) {
      // Level 15: @ (at symbol)
      float dist5 = length(grid5 - 2.0);
      val = (dist5 > 1.2 && dist5 < 2.2) ? 1.0 : 0.0;
      if (grid5.x >= 2.0 && grid5.y == 2.0) val = 1.0;
    }
    else {
      // Level 16: M (letter M) - most complex
      val = (grid5.x == 0.0 || grid5.x == 4.0) ? 1.0 : 0.0;
      if ((grid5.x == 1.0 || grid5.x == 3.0) && grid5.y >= 3.0) val = 1.0;
      if (grid5.x == 2.0 && grid5.y == 4.0) val = 1.0;
    }
  }
  
  return val;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 workUV = uv;

  // PRE-PROCESSING (Tier 2)
  // Screen curvature
  if (curvature > 0.0) {
    vec2 centered = workUV * 2.0 - 1.0;
    centered *= 1.0 + curvature * dot(centered, centered);
    workUV = centered * 0.5 + 0.5;
    if (workUV.x < 0.0 || workUV.x > 1.0 || workUV.y < 0.0 || workUV.y > 1.0) {
      outputColor = vec4(0.0);
      return;
    }
  }

  // Wave distortion
  if (waveAmplitude > 0.0) {
    workUV.x += sin(workUV.y * waveFrequency + time * waveSpeed) * waveAmplitude;
    workUV.y += cos(workUV.x * waveFrequency + time * waveSpeed) * waveAmplitude;
  }

  // CORE ASCII RENDERING
  float currentTime = targetFPS > 0.0 ? floor(time * targetFPS) / targetFPS : time;

  vec4 sampledColor;
  if (aberrationStrength > 0.0) {
    float offset = aberrationStrength;
    vec2 uvR = workUV + vec2(offset, 0.0);
    vec2 uvG = workUV;
    vec2 uvB = workUV - vec2(offset, 0.0);
    float r = texture(inputBuffer, uvR).r;
    float g = texture(inputBuffer, uvG).g;
    float b = texture(inputBuffer, uvB).b;
    sampledColor = vec4(r, g, b, 1.0);
  } else {
    sampledColor = texture(inputBuffer, workUV);
  }

  // Time-based noise
  if (noiseIntensity > 0.0) {
    float noiseVal = noise(workUV * noiseScale + time * noiseSpeed);
    sampledColor.rgb += (noiseVal - 0.5) * noiseIntensity;
  }

  // Jitter
  vec2 cellCount = resolution / cellSize;
  vec2 cellCoord = floor(uv * cellCount);
  if (jitterIntensity > 0.0) {
    float jitterTime = time * jitterSpeed;
    float jitterX = (random(vec2(cellCoord.y, floor(jitterTime))) - 0.5) * jitterIntensity * 2.0;
    float jitterY = (random(vec2(cellCoord.x, floor(jitterTime + 1000.0))) - 0.5) * jitterIntensity * 2.0;
    cellCoord += vec2(jitterX, jitterY);
  }

  // RGB Glitch
  if (glitchIntensity > 0.0 && glitchFrequency > 0.0) {
    float glitchTime = floor(time * glitchFrequency);
    float glitchRand = random(vec2(glitchTime, cellCoord.y));
    if (glitchRand < glitchIntensity) {
      float shift = (random(vec2(glitchTime + 1.0, cellCoord.y)) - 0.5) * 20.0;
      cellCoord.x += shift;
    }
  }

  vec2 cellUV = (cellCoord + 0.5) / cellCount;
  vec4 cellColor = texture(inputBuffer, cellUV);
  
  // Apply brightness, contrast, and saturation to cellColor (only if not background)
  float bgDiff = length(cellColor.rgb - backgroundColor);
  if (bgDiff > 0.01) {
    cellColor.rgb = (cellColor.rgb - 0.5) * contrastAdjust + 0.5 + brightnessAdjust;
    float cellLum = dot(cellColor.rgb, vec3(0.299, 0.587, 0.114));
    cellColor.rgb = mix(vec3(cellLum), cellColor.rgb, saturationAdjust);
  }
  
  float brightness = dot(cellColor.rgb, vec3(0.299, 0.587, 0.114));

  if (invert) brightness = 1.0 - brightness;

  vec2 localUV = fract(uv * cellCount);
  
  // Apply cell spacing
  // Positive spacing creates gaps between cells, negative makes patterns larger
  float spacingAmount = cellSpacing;
  
  // For positive spacing: shrink the active area of each cell to create gaps
  if (spacingAmount > 0.0) {
    // Check if we're in the gap region (border of the cell)
    float borderSize = spacingAmount * 0.5; // Half on each side
    if (localUV.x < borderSize || localUV.x > (1.0 - borderSize) || 
        localUV.y < borderSize || localUV.y > (1.0 - borderSize)) {
      outputColor = vec4(backgroundColor, 1.0);
      return;
    }
    // Remap the interior UV to 0-1
    localUV = (localUV - borderSize) / (1.0 - 2.0 * borderSize);
  }
  // For negative spacing: scale pattern from center to make it appear larger
  else if (spacingAmount < 0.0) {
    // Scale down the UV coordinates to make pattern appear larger
    // This zooms into the pattern center
    float scale = 1.0 + (spacingAmount * -2.0); // 1.0 to 2.0 range for -0.5 to 0
    localUV = (localUV - 0.5) / scale + 0.5;
    
    // Keep UV in valid range to prevent pattern breaking
    localUV = clamp(localUV, 0.0, 1.0);
  }
  
  float charValue = getChar(brightness, localUV, asciiStyle);

  // Cell density - randomly hide cells based on density value
  if (densityMask > 0) {
    float effectiveDensity = cellDensity;
    
    // Apply image mask
    if (densityMask == 7 && hasDensityMaskTexture) {
      // Calculate aspect-corrected UV to prevent stretching
      vec2 centeredUV = uv - 0.5;
      
      // Mask aspect ratio from loaded texture
      float logoAspect = 0.8467;
      // Viewport aspect ratio
      float viewportAspect = resolution.x / resolution.y;
      
      // Since logo is narrower than viewport, compress the width on screen
      // by expanding the X sampling range
      float aspectRatio = viewportAspect / logoAspect;
      centeredUV.x *= aspectRatio; // Expand X sampling to make logo appear narrower
      
      // Apply position offset (invert X for intuitive direction)
      centeredUV.x -= maskOffsetX;
      centeredUV.y += maskOffsetY;
      
      vec2 maskUV = centeredUV / maskScale + 0.5;
      
      // Check if UV is out of bounds - if so, use densityStart (transparent)
      if (maskUV.x < 0.0 || maskUV.x > 1.0 || maskUV.y < 0.0 || maskUV.y > 1.0) {
        effectiveDensity = densityStart;
      } else {
        vec4 maskColor = texture(densityMaskTexture, maskUV);
        float maskBrightness = maskColor.a; // Use alpha channel (transparency) - transparent = 0, opaque = 1
        effectiveDensity = mix(densityStart, densityEnd, maskBrightness);
      }
    }
    // Apply gradient mask
    else if (densityMask > 1) { // Gradient modes
      float gradientValue = 0.0;
      float adjustedMidpoint = gradientMidpoint * 2.0; // Map 0-1 to 0-2 range
      
      if (densityMask == 2) { // Gradient: Up (start at top, end at bottom)
        gradientValue = smoothstep(0.0, adjustedMidpoint, uv.y);
      } else if (densityMask == 3) { // Gradient: Down (start at bottom, end at top)
        gradientValue = smoothstep(0.0, adjustedMidpoint, 1.0 - uv.y);
      } else if (densityMask == 4) { // Gradient: Left (start at left, end at right)
        gradientValue = smoothstep(0.0, adjustedMidpoint, uv.x);
      } else if (densityMask == 5) { // Gradient: Right (start at right, end at left)
        gradientValue = smoothstep(0.0, adjustedMidpoint, 1.0 - uv.x);
      } else if (densityMask == 6) { // Gradient: Radial (start at center, end at edge)
        vec2 center = vec2(0.5, 0.5);
        float dist = distance(uv, center);
        float maxDist = 0.707; // Distance from center to corner (sqrt(0.5^2 + 0.5^2))
        float normalizedDist = dist / maxDist;
        gradientValue = smoothstep(0.0, adjustedMidpoint, normalizedDist);
      }
      
      effectiveDensity = mix(densityStart, densityEnd, gradientValue);
    }
    
    float cellRandom = random(cellCoord + vec2(randomSeed));
    if (cellRandom > (effectiveDensity / 100.0)) {
      charValue = 0.0;
    }
  }

  vec3 finalColor;
  if (colorMode) {
    finalColor = cellColor.rgb * charValue;
  } else {
    finalColor = vec3(brightness * charValue);
  }

  // POST-PROCESSING (Tier 1)
  finalColor = applyColorPalette(finalColor, colorPalette);

  // Mouse glow
  if (mouseGlowEnabled) {
    vec2 pixelPos = uv * resolution;
    float dist = length(pixelPos - mousePos);
    float glow = exp(-dist / mouseGlowRadius) * mouseGlowIntensity;
    finalColor += glow;
  }

  // Scanlines
  if (scanlineIntensity > 0.0) {
    float scanline = sin(uv.y * scanlineCount * 3.14159) * 0.5 + 0.5;
    finalColor *= 1.0 - (scanline * scanlineIntensity);
  }

  // Vignette
  if (vignetteIntensity > 0.0) {
    vec2 centered = uv * 2.0 - 1.0;
    float vignette = 1.0 - dot(centered, centered) / vignetteRadius;
    finalColor *= mix(1.0, vignette, vignetteIntensity);
  }

  // Make black pixels transparent to show background image (if enabled)
  float luminance = dot(finalColor, vec3(0.299, 0.587, 0.114));
  float alpha = cellColor.a;
  
  // If makeBlackAlpha is enabled and pixel is very dark, make it transparent
  if (makeBlackAlpha && luminance < 0.01) {
    alpha = 0.0;
  }

  outputColor = vec4(finalColor, alpha);
}
`

// Module-level variables for state management
let _time = 0
let _deltaAccumulator = 0
let _cellSize = 8
let _cellSpacing = 0.0
let _invert = false
let _colorMode = true
let _asciiStyle = 0
let _blurAmount = 1.0
let _minSize = 0.2
let _maxSize = 1.8
let _resolution = new Vector2(1920, 1080)
let _mousePos = new Vector2(0, 0)
let _brightnessAdjust = 0
let _contrastAdjust = 1
let _saturationAdjust = 1
let _backgroundColor = [0.36, 0.36, 0.36]
let _cellDensity = 100
let _randomSeed = 0
let _densityMask = 0
let _gradientMidpoint = 0.5
let _densityStart = 0
let _densityEnd = 100
let _maskTexture = null
let _hasMaskTexture = false
let _maskScale = 1.0
let _maskOffsetX = 0.0
let _maskOffsetY = 0.0
let _makeBlackAlpha = true

class AsciiEffectImpl extends Effect {
  constructor(options) {
    const {
      cellSize = 16,
      invert = false,
      color = true,
      style = 0,
      blur = 1.0,
      minSize = 0.2,
      maxSize = 1.8,
      resolution = new Vector2(1920, 1080),
      mousePos = new Vector2(0, 0),
      postfx = {}
    } = options

    super("AsciiEffect", fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([
        ["cellSize", new Uniform(cellSize)],
        ["cellSpacing", new Uniform(postfx.cellSpacing || 0.0)],
        ["invert", new Uniform(invert)],
        ["colorMode", new Uniform(color)],
        ["asciiStyle", new Uniform(style)],
        ["blurAmount", new Uniform(blur)],
        ["minSize", new Uniform(minSize)],
        ["maxSize", new Uniform(maxSize)],
        ["time", new Uniform(0)],
        ["resolution", new Uniform(resolution)],
        ["mousePos", new Uniform(mousePos)],
        ["scanlineIntensity", new Uniform(postfx.scanlineIntensity || 0)],
        ["scanlineCount", new Uniform(postfx.scanlineCount || 200)],
        ["targetFPS", new Uniform(postfx.targetFPS || 0)],
        ["jitterIntensity", new Uniform(postfx.jitterIntensity || 0)],
        ["jitterSpeed", new Uniform(postfx.jitterSpeed || 1)],
        ["mouseGlowEnabled", new Uniform(postfx.mouseGlowEnabled || false)],
        ["mouseGlowRadius", new Uniform(postfx.mouseGlowRadius || 200)],
        ["mouseGlowIntensity", new Uniform(postfx.mouseGlowIntensity || 1.5)],
        ["vignetteIntensity", new Uniform(postfx.vignetteIntensity || 0)],
        ["vignetteRadius", new Uniform(postfx.vignetteRadius || 0.8)],
        ["colorPalette", new Uniform(postfx.colorPalette || 0)],
        ["curvature", new Uniform(postfx.curvature || 0)],
        ["aberrationStrength", new Uniform(postfx.aberrationStrength || 0)],
        ["noiseIntensity", new Uniform(postfx.noiseIntensity || 0)],
        ["noiseScale", new Uniform(postfx.noiseScale || 1)],
        ["noiseSpeed", new Uniform(postfx.noiseSpeed || 1)],
        ["waveAmplitude", new Uniform(postfx.waveAmplitude || 0)],
        ["waveFrequency", new Uniform(postfx.waveFrequency || 10)],
        ["waveSpeed", new Uniform(postfx.waveSpeed || 1)],
        ["glitchIntensity", new Uniform(postfx.glitchIntensity || 0)],
        ["glitchFrequency", new Uniform(postfx.glitchFrequency || 0)],
        ["brightnessAdjust", new Uniform(postfx.brightnessAdjust || 0)],
        ["contrastAdjust", new Uniform(postfx.contrastAdjust || 1)],
        ["saturationAdjust", new Uniform(postfx.saturationAdjust || 1)],
        ["backgroundColor", new Uniform(postfx.backgroundColor || [0.36, 0.36, 0.36])],
        ["cellDensity", new Uniform(postfx.cellDensity || 100)],
        ["randomSeed", new Uniform(postfx.randomSeed || 0)],
        ["densityMask", new Uniform(postfx.densityMask || 0)],
        ["gradientMidpoint", new Uniform(postfx.gradientMidpoint || 0.5)],
        ["densityStart", new Uniform(postfx.densityStart || 0)],
        ["densityEnd", new Uniform(postfx.densityEnd || 100)],
        ["densityMaskTexture", new Uniform(postfx.densityMaskTexture || null)],
        ["hasDensityMaskTexture", new Uniform(postfx.hasDensityMaskTexture || false)],
        ["maskScale", new Uniform(postfx.maskScale || 1.0)],
        ["maskOffsetX", new Uniform(postfx.maskOffsetX || 0.0)],
        ["maskOffsetY", new Uniform(postfx.maskOffsetY || 0.0)],
        ["makeBlackAlpha", new Uniform(postfx.makeBlackAlpha ?? true)],
      ]),
    })

    _cellSize = cellSize
    _cellSpacing = postfx.cellSpacing || 0.0
    _invert = invert
    _colorMode = color
    _asciiStyle = style
    _blurAmount = blur
    _minSize = minSize
    _maxSize = maxSize
    _resolution = resolution
    _mousePos = mousePos
    _brightnessAdjust = postfx.brightnessAdjust || 0
    _contrastAdjust = postfx.contrastAdjust || 1
    _saturationAdjust = postfx.saturationAdjust || 1
    _backgroundColor = postfx.backgroundColor || [0.36, 0.36, 0.36]
    _cellDensity = postfx.cellDensity || 100
    _randomSeed = postfx.randomSeed || 0
    _densityMask = postfx.densityMask || 0
    _gradientMidpoint = postfx.gradientMidpoint || 0.5
    _densityStart = postfx.densityStart || 0
    _densityEnd = postfx.densityEnd || 100
    _maskTexture = postfx.densityMaskTexture || null
    _hasMaskTexture = postfx.hasDensityMaskTexture || false
    _maskScale = postfx.maskScale || 1.0
    _maskOffsetX = postfx.maskOffsetX || 0.0
    _maskOffsetY = postfx.maskOffsetY || 0.0
    _makeBlackAlpha = postfx.makeBlackAlpha ?? true
  }

  update(renderer, inputBuffer, deltaTime) {
    const targetFPS = this.uniforms.get("targetFPS").value

    if (targetFPS > 0) {
      const frameDuration = 1 / targetFPS
      _deltaAccumulator += deltaTime
      if (_deltaAccumulator >= frameDuration) {
        _time += frameDuration
        _deltaAccumulator = _deltaAccumulator % frameDuration
      }
    } else {
      _time += deltaTime
    }

    this.uniforms.get("time").value = _time
    this.uniforms.get("cellSize").value = _cellSize
    this.uniforms.get("cellSpacing").value = _cellSpacing
    this.uniforms.get("invert").value = _invert
    this.uniforms.get("colorMode").value = _colorMode
    this.uniforms.get("asciiStyle").value = _asciiStyle
    this.uniforms.get("blurAmount").value = _blurAmount
    this.uniforms.get("minSize").value = _minSize
    this.uniforms.get("maxSize").value = _maxSize
    this.uniforms.get("resolution").value = _resolution
    this.uniforms.get("mousePos").value = _mousePos
    this.uniforms.get("brightnessAdjust").value = _brightnessAdjust
    this.uniforms.get("contrastAdjust").value = _contrastAdjust
    this.uniforms.get("saturationAdjust").value = _saturationAdjust
    this.uniforms.get("backgroundColor").value = _backgroundColor
    this.uniforms.get("cellDensity").value = _cellDensity
    this.uniforms.get("randomSeed").value = _randomSeed
    this.uniforms.get("densityMask").value = _densityMask
    this.uniforms.get("gradientMidpoint").value = _gradientMidpoint
    this.uniforms.get("densityStart").value = _densityStart
    this.uniforms.get("densityEnd").value = _densityEnd
    this.uniforms.get("densityMaskTexture").value = _maskTexture
    this.uniforms.get("hasDensityMaskTexture").value = _hasMaskTexture
    this.uniforms.get("maskScale").value = _maskScale
    this.uniforms.get("maskOffsetX").value = _maskOffsetX
    this.uniforms.get("maskOffsetY").value = _maskOffsetY
    this.uniforms.get("makeBlackAlpha").value = _makeBlackAlpha
  }
}

export const AsciiEffect = forwardRef((props, ref) => {
  const {
    style = "standard",
    cellSize = 16,
    invert = false,
    color = true,
    blur = 1.0,
    minSize = 0.2,
    maxSize = 1.8,
    postfx = {},
    resolution = new Vector2(1920, 1080),
    mousePos = new Vector2(0, 0)
  } = props

  const styleMap = { standard: 0, dense: 1, minimal: 2, blocks: 3, "standard-dots": 4, "melding-dots": 5, "ascii-characters-minimal": 6, "ascii-characters-normal": 7 }
  const styleNum = styleMap[style] || 0

  _cellSize = cellSize
  _cellSpacing = postfx?.cellSpacing ?? 0.0
  _invert = invert
  _colorMode = color
  _asciiStyle = styleNum
  _blurAmount = blur
  _minSize = minSize
  _maxSize = maxSize
  _resolution = resolution
  _mousePos = mousePos
  _brightnessAdjust = postfx.brightnessAdjust || 0
  _contrastAdjust = postfx.contrastAdjust || 1
  _saturationAdjust = postfx.saturationAdjust || 1
  _backgroundColor = postfx.backgroundColor || [0.36, 0.36, 0.36]
  _cellDensity = postfx.cellDensity || 100
  _randomSeed = postfx.randomSeed || 0
  _densityMask = postfx.densityMask || 0
  _gradientMidpoint = postfx.gradientMidpoint || 0.5
  _densityStart = postfx.densityStart || 0
  _densityEnd = postfx.densityEnd || 100
  _maskTexture = postfx.densityMaskTexture || null
  _hasMaskTexture = postfx.hasDensityMaskTexture || false
  _maskScale = postfx.maskScale || 1.0
  _maskOffsetX = postfx.maskOffsetX || 0.0
  _maskOffsetY = postfx.maskOffsetY || 0.0
  _makeBlackAlpha = postfx?.makeBlackAlpha ?? true
  console.log('AsciiEffect props:', { 
    brightness: postfx.brightnessAdjust, 
    contrast: postfx.contrastAdjust, 
    saturation: postfx.saturationAdjust,
    _brightnessAdjust,
    _contrastAdjust,
    _saturationAdjust
  })

  const effect = useMemo(
    () => new AsciiEffectImpl({ cellSize, invert, color, style: styleNum, blur, minSize, maxSize, postfx, resolution, mousePos }),
    []
  )

  return <primitive ref={ref} object={effect} dispose={null} />
})

AsciiEffect.displayName = "AsciiEffect"
