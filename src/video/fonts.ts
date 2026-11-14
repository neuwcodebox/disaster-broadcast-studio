export const fonts = [
  {
    id: 'body',
    package: '@fontsource/ibm-plex-sans-kr',
    family: 'IBM Plex Sans KR',
    weights: [400, 600],
  },
  { id: 'mono', package: '@fontsource/ibm-plex-mono', family: 'IBM Plex Mono', weights: [400] },
] as const;
export const bodyFont = '"IBM Plex Sans KR", sans-serif';
export const numberFont = '"IBM Plex Mono", "IBM Plex Sans KR", monospace';
