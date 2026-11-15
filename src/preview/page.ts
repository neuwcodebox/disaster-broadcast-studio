export const previewPage = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>재난방송실 · 미리보기</title>
  <style>
    :root { color-scheme: dark; font-family: system-ui, sans-serif; background: #101417; color: #dce1e5; }
    * { box-sizing: border-box; }
    body { margin: 0; }
    .preview { max-width: 1500px; margin: auto; padding: 24px; }
    .preview > header, .tools { display: flex; align-items: center; flex-wrap: wrap; gap: 14px; }
    .preview > header { justify-content: space-between; margin-bottom: 18px; }
    .preview > header h1 { font-size: 22px; margin: 0; }
    .preview > p { color: #aab5bd; line-height: 1.6; }
    .player { background: #000; border: 1px solid #3c464e; }
    .tools { padding: 16px 0; }
    .tools button, .tools input, .tools select { font: inherit; padding: 7px 10px; background: #202a31; color: #e4e9ed; border: 1px solid #53616b; border-radius: 4px; }
    .tools button { cursor: pointer; }
    .tools input { width: 110px; }
    .tools label { display: flex; align-items: center; gap: 8px; }
    .tools output { font-variant-numeric: tabular-nums; }
    .status { font-size: 14px; color: #aab5bd; }
    .preview .error { color: #ffd0c8; background: #3c2423; border: 1px solid #8f5952; padding: 14px; white-space: pre-wrap; overflow-wrap: anywhere; }
    .preview .warnings { color: #e4ce9e; white-space: pre-wrap; }
    @media (max-width: 700px) { .preview { padding: 12px; } }
  </style>
</head>
<body><div id="root"></div><script>window.remotion_staticBase = '/public';</script><script src="/bundle.js"></script></body>
</html>`;
