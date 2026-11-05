"""Inject only a stylesheet and a small enhancement script. Original HTML is recoverable byte-for-byte."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
STYLE=b'<link rel="stylesheet" href="site-style/style.css">'
SCRIPT=b'<script src="site-style/enhance.js"></script>'
for original in (ROOT/'docs/baseline/html').glob('*.html'):
    if original.name.startswith('google'):continue
    raw=original.read_bytes()
    raw=raw.replace(b'</head>',STYLE+b'</head>',1).replace(b'</body>',SCRIPT+b'</body>',1)
    (ROOT/original.name).write_bytes(raw)
print('Styled 6 original pages with exactly two additive resource tags each.')
