# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Earth is a global map encyclopedia platform — a 2D interactive world map where data layers (e.g., mineral distribution) can be overlaid and explored. Built for the Chinese market with a China-centered map layout (Europe left, Americas right).

## Commands

- `npm run dev` — start Vite dev server (http://localhost:5173)
- `npm run build` — type-check with `tsc -b` then production build with Vite
- `npx tsc --noEmit` — type-check only (no lint or test tooling configured yet)

## Architecture

### Data Layer System

The core abstraction is **LayerConfig** (`src/layers/types.ts`). Each encyclopedia topic is a layer with an id, display metadata, and a GeoJSON data URL. The system has three parts:

1. **Layer config** (`src/layers/<topic>.ts`) — defines the layer's metadata, legend colors, and MapLibre paint styles
2. **GeoJSON data** (`public/data/<topic>.geojson`) — the actual geographic data. Each feature must include a `country_id` field (ISO 3166-1 numeric, matching `world-atlas` IDs) to enable country-level aggregation
3. **Registry** (`src/layers/registry.ts`) — central list of all available layers; new layers must be imported and added here

### Adding a New Encyclopedia Topic

1. Create a GeoJSON file in `public/data/` with features containing `country_id`
2. Create a layer config in `src/layers/` (see `minerals.ts` as reference)
3. Register it in `src/layers/registry.ts`

### Map Rendering (`src/components/MapView.tsx`)

MapView is the most complex component. On load it:
- Dynamically imports `world-atlas/countries-110m.json` (TopoJSON) and converts to GeoJSON via `topojson-client`
- Runs `fixAntimeridian()` to normalize polygon coordinates across the 180° meridian (prevents rendering artifacts for countries like Russia)
- Joins country polygons with layer data by `country_id` to create a choropleth
- Renders 4 MapLibre layers: country fill (choropleth), country border, hover highlight, and data points

Country polygons only render for countries that have data (others are filtered out). Click interactions use `onSelectRef` (a ref-based callback pattern) to avoid re-creating the map when React state changes.

### Component Flow

`App` → `LayerPanel` (left sidebar, layer toggles) + `MapView` (center, map) + `CountryDetail` (right drawer, opens on country click)

State: `useLayers` hook manages layer visibility; `App` holds `selectedCountry` state for the detail drawer.

## Key Technical Decisions

- **Tile source**: OpenStreetMap raster tiles (no API key required; avoid Google Fonts or CDNs that may be slow in China)
- **Country boundaries**: `world-atlas` npm package (110m TopoJSON, ~105KB), converted at runtime — country IDs are ISO 3166-1 numeric strings (e.g., "156" for China, "840" for USA)
- **Antimeridian handling**: `fixRing()` normalizes consecutive coordinates to prevent >180° longitude jumps that cause rendering artifacts
- **No external font imports**: uses system font stack (`PingFang SC`, `Microsoft YaHei`) to avoid CSS-blocking network requests
