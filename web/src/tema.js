import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

// Verde de cancha para las acciones y naranja de pelota para lo que pide atencion
// (lugares que faltan, turnos por vencer). El fondo queda neutro: la energia la ponen ellos.
const escala = (h1, h2, pasos) =>
  Object.fromEntries(Object.entries(pasos).map(([k, [l, c, alto]]) => [k, { value: `oklch(${l} ${c} ${alto ? h2 : h1})` }]));

const config = defineConfig({
  globalCss: {
    html: { colorPalette: 'brand', WebkitTapHighlightColor: 'transparent' },
    body: { bg: 'bg', color: 'fg' },
    'h1, h2, h3': { textWrap: 'balance' },
    '@media (prefers-reduced-motion: reduce)': {
      '*, *::before, *::after': { animationDuration: '0.01ms !important', transitionDuration: '0.01ms !important' },
    },
  },
  theme: {
    tokens: {
      fonts: {
        heading: { value: "'Barlow Condensed', 'Arial Narrow', system-ui, sans-serif" },
        body: { value: "'Barlow', system-ui, -apple-system, 'Segoe UI', sans-serif" },
      },
      colors: {
        brand: escala(158, 160, {
          50: [0.97, 0.02], 100: [0.93, 0.045], 200: [0.87, 0.08], 300: [0.8, 0.12], 400: [0.72, 0.15],
          500: [0.6, 0.15], 600: [0.47, 0.12], 700: [0.4, 0.1, true], 800: [0.33, 0.08, true],
          900: [0.26, 0.06, true], 950: [0.19, 0.04, true],
        }),
        pelota: escala(55, 42, {
          50: [0.97, 0.02], 100: [0.93, 0.05], 200: [0.87, 0.09], 300: [0.8, 0.13], 400: [0.74, 0.16],
          500: [0.66, 0.18, true], 600: [0.58, 0.17, true], 700: [0.5, 0.15, true], 800: [0.42, 0.12, true],
          900: [0.34, 0.09, true], 950: [0.25, 0.06, true],
        }),
      },
    },
    semanticTokens: {
      colors: Object.fromEntries(
        ['brand', 'pelota'].map((p) => [
          p,
          {
            solid: { value: { _light: `{colors.${p}.600}`, _dark: `{colors.${p}.400}` } },
            contrast: { value: { _light: 'white', _dark: `{colors.${p}.950}` } },
            fg: { value: { _light: `{colors.${p}.700}`, _dark: `{colors.${p}.300}` } },
            muted: { value: { _light: `{colors.${p}.100}`, _dark: `{colors.${p}.900}` } },
            subtle: { value: { _light: `{colors.${p}.50}`, _dark: `{colors.${p}.950}` } },
            emphasized: { value: { _light: `{colors.${p}.200}`, _dark: `{colors.${p}.800}` } },
            focusRing: { value: { _light: `{colors.${p}.600}`, _dark: `{colors.${p}.400}` } },
            border: { value: { _light: `{colors.${p}.300}`, _dark: `{colors.${p}.700}` } },
          },
        ]),
      ),
    },
  },
});

export const sistema = createSystem(defaultConfig, config);
