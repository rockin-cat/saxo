#!/usr/bin/env python3
"""Posa el número de versió a tot arreu i refà el mapa d'importació (així cap navegador es queda amb fitxers vells).
Ús: python3 tools/versio.py 23 "26-10-2026"
"""
import json, os, re, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
v, date = sys.argv[1], sys.argv[2]
p = os.path.join(root, 'index.html')
s = open(p, encoding='utf-8').read()
files = []
for d in ['js', 'js/data']:
    for f in sorted(os.listdir(os.path.join(root, d))):
        if f.endswith('.js'):
            files.append(f'{d}/{f}')
imap = {'imports': {f'./{f}': f'./{f}?v={v}' for f in files}}
block = '<script type="importmap" id="versions">' + json.dumps(imap, ensure_ascii=False) + '</script>'
s = re.sub(r'<script type="importmap" id="versions">.*?</script>\n?', '', s, flags=re.S)
s = re.sub(r'<script type="module" src="js/app\.js[^"]*"></script>', block + '\n  <script type="module" src="js/app.js?v=' + v + '"></script>', s)
s = re.sub(r'v\d+ · \d\d-\d\d-\d{4}', f'v{v} · {date}', s)
s = re.sub(r'Versió \d+ · \d\d-\d\d-\d{4}', f'Versió {v} · {date}', s)
s = re.sub(r'href="css/style\.css[^"]*"', f'href="css/style.css?v={v}"', s)
open(p, 'w', encoding='utf-8').write(s)
print('versió', v, '·', len(files), 'mòduls')
