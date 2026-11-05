"""Record original URLs/legal bytes BEFORE editing; verify them after editing."""
import argparse
import hashlib
import json
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'docs' / 'baseline'
VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}

class Scan(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=False)
        self.text, self.ids, self.blocks, self.stack = text, [], [], []
        self.lines = [0]
        for m in re.finditer('\n', text): self.lines.append(m.end())
        self.feed(text)
    def absolute_offset(self):
        line, col = self.getpos()
        return self.lines[line - 1] + col
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        ident = attrs.get('id', '')
        if ident: self.ids.append(ident)
        legal = bool(re.search(r'privacy|terms|^panel-(pp|tos)$', ident, re.I)) and tag not in VOID
        if tag not in VOID: self.stack.append((tag, self.absolute_offset(), legal, ident))
    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1, -1, -1):
            if self.stack[i][0] == tag:
                _, start, legal, ident = self.stack[i]
                if legal:
                    end = self.text.find('>', self.absolute_offset())+1
                    self.blocks.append((ident, self.text[start:end].encode('utf-8')))
                del self.stack[i:]
                break

def digest(data): return hashlib.sha256(data).hexdigest()

def snapshot():
    BASE.mkdir(parents=True, exist_ok=True)
    manifest = {'html': {}, 'legal': [], 'pdf': {}}
    inventory = ['# Original URL and anchor inventory', '', 'Captured before redesign. Original legal blocks are saved byte-for-byte in `baseline/`.', '']
    for path in sorted(ROOT.glob('*.html')):
        scan = Scan(path.read_bytes().decode('utf-8'))
        manifest['html'][path.name] = scan.ids
        inventory += [f'## `{path.name}`', '', *[f'- `{path.name}#{i}`' for i in scan.ids], '']
        for ident, data in scan.blocks:
            filename = f'{path.stem}--{ident}.html'
            (BASE / filename).write_bytes(data)
            manifest['legal'].append({'file':path.name, 'id':ident, 'copy':filename, 'sha256':digest(data)})
    for folder in ('privacy-policy', 'tos'):
        for path in sorted((ROOT / folder).glob('*')):
            if path.is_file(): manifest['pdf'][path.relative_to(ROOT).as_posix()] = digest(path.read_bytes())
    inventory += ['## Protected Privacy / Terms sections', '', *[f"- `{x['file']}#{x['id']}` → `baseline/{x['copy']}`" for x in manifest['legal']], '', '## Protected legal documents', '', *[f'- `{p}`' for p in manifest['pdf']], '', 'AstraBudget uses PDF panels. Its original incoming #privacy-policy and #terms-of-service hashes are also retained by the page script. AstraWorld has inline #privacy-policy and #terms. HydraScan uses English PDF policy and terms. No new legal terms are authored.', '']
    (BASE/'urls.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False)+'\n', encoding='utf-8')
    (ROOT/'docs'/'url-inventory.md').write_text('\n'.join(inventory), encoding='utf-8')
    print(f"BASELINE: {len(manifest['html'])} HTML files; {sum(map(len,manifest['html'].values()))} anchors; {len(manifest['legal'])} legal blocks; {len(manifest['pdf'])} legal documents")

def check():
    manifest = json.loads((BASE/'urls.json').read_text(encoding='utf-8'))
    errors = []
    scans = {}
    for file, ids in manifest['html'].items():
        path = ROOT/file
        if not path.exists(): errors.append(f'MISSING FILE {file}'); continue
        scans[file] = Scan(path.read_bytes().decode('utf-8'))
        for ident in ids:
            if ident not in scans[file].ids: errors.append(f'MISSING ANCHOR {file}#{ident}')
    for entry in manifest['legal']:
        blocks = dict(scans.get(entry['file'], Scan('')).blocks)
        data = blocks.get(entry['id'])
        original = (BASE/entry['copy']).read_bytes()
        if digest(original) != entry['sha256'] or data != original: errors.append(f"CHANGED LEGAL BYTES {entry['file']}#{entry['id']}")
    for file, expected in manifest['pdf'].items():
        if not (ROOT/file).exists() or digest((ROOT/file).read_bytes()) != expected: errors.append(f'CHANGED LEGAL DOCUMENT {file}')
    if errors:
        print('\n'.join(errors)); raise SystemExit(1)
    print(f"PASS: {len(manifest['html'])} original HTML URLs; {sum(map(len,manifest['html'].values()))} original IDs; {len(manifest['legal'])} legal blocks BYTE-IDENTICAL; {len(manifest['pdf'])} legal documents SHA-256 IDENTICAL.")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--snapshot', action='store_true')
    args = parser.parse_args()
    snapshot() if args.snapshot else check()
