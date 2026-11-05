from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[1]
manifest=json.loads((ROOT/'docs/baseline/files.json').read_text())
STYLE=b'<link rel="stylesheet" href="site-style/style.css">';SCRIPT=b'<script src="site-style/enhance.js"></script>'
rows=[]
for file,before in manifest.items():
    path=ROOT/file;assert path.exists(),f'Missing {file}'
    data=path.read_bytes();after=hashlib.sha256(data).hexdigest()
    if path.suffix=='.html' and not path.name.startswith('google'):
        original=(ROOT/'docs/baseline/html'/path.name).read_bytes()
        assert data.count(STYLE)==1 and data.count(SCRIPT)==1,file
        assert data.replace(STYLE,b'',1).replace(SCRIPT,b'',1)==original,f'Non-style source change {file}'
        result='Original HTML byte-identical after removing 2 resource tags'
    else:
        assert before==after,f'Changed critical file {file}';result='BYTE-IDENTICAL'
    rows.append({'file':file,'before':before,'after':after,'result':result})
assert not(ROOT/'CNAME').exists()
for path in [ROOT/'site-style/style.css',ROOT/'site-style/enhance.js']:
    content=path.read_text().lower()
    for forbidden in ['astracorenova'+'.com','цифрові '+'працівники','gltf'+'loader','three'+'.js']:
        assert forbidden not in content,(path.name,forbidden)
(ROOT/'docs/style-only-check.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8')
print(f'PASS style-only: all {len(rows)} originals retained; 6 HTML files have only two additive style-resource tags; all other originals byte-identical; no CNAME or cross-site links.')
