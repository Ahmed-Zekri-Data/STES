"""Reads the AstralPool UK 2025 catalogue: every priced reference (code, model
text, UK list price) grouped under its product (title, description), family
and sub-family. Writes catalogue.json and a summary."""
import json
import re
import sys
import fitz

PDF = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else 'catalogue.json'

CODE = re.compile(r'^[A-Z]{0,4}\d{4,7}([A-Z]{1,3}\d{0,4})?(-\d{2,4})?$')
PRICE = re.compile(r'^\d{1,3}(,\d{3})*\.\d{2}$')

def spans(page):
    out = []
    for b in page.get_text('dict')['blocks']:
        for l in b.get('lines', []):
            for s in l['spans']:
                t = s['text'].strip()
                if t:
                    x0, y0, x1, y1 = s['bbox']
                    out.append({'t': t, 'x': x0, 'x1': x1, 'y': (y0 + y1) / 2, 'size': round(s['size'], 1), 'bold': 'Bd' in s['font'] or 'Bold' in s['font'], 'font': s['font']})
    # Some text is printed twice on top of itself: keep one copy
    seen, unique = set(), []
    for s in out:
        k = (s['t'], round(s['x']), round(s['y']))
        if k not in seen:
            seen.add(k)
            unique.append(s)
    return unique

doc = fitz.open(PDF)
products = []
family = sub = None
for pno in range(doc.page_count):
    page = doc[pno]
    ss = spans(page)
    width = page.rect.width
    heads = [s for s in ss if s['size'] >= 17 and s['y'] < 60]
    if heads:
        family = ' '.join(h['t'] for h in sorted(heads, key=lambda h: h['x']))
    subs = [s for s in ss if 11.5 <= s['size'] < 13 and s['bold']]
    titles = sorted([s for s in ss if 9.3 <= s['size'] < 11.5 and s['y'] > 100 and not re.match(r'^[\d.]+$', s['t'])], key=lambda s: (s['y'], s['x']))
    # Price rows: a code and a price on the same line
    prices = [s for s in ss if PRICE.match(s['t']) and s['x'] > width * 0.45]
    for price in prices:
        line = [s for s in ss if abs(s['y'] - price['y']) < 2.5 and s['x'] < price['x']]
        codes = [s for s in line if CODE.match(s['t'].replace(' ', ''))]
        if not codes:
            continue
        code = max(codes, key=lambda s: s['x'])
        first_code_x = min(c['x'] for c in codes)
        cells = [s for s in line if s['x'] < first_code_x and not PRICE.match(s['t'])]
        group = [c for c in cells if len(c['t']) == 1 and c['t'].isalpha() and c['bold']]
        text = ' '.join(c['t'] for c in sorted(cells, key=lambda c: c['x']) if c not in group)
        # Tables with several price columns: add the column's heading (e.g. Titanium)
        if len(codes) > 1:
            heads = [s for s in ss if code['y'] - 60 < s['y'] < code['y'] - 3 and abs(s['x'] - code['x']) < 12 and s['bold'] and s['t'] not in ('Code', 'Unit £') and not CODE.match(s['t'])]
            if heads:
                text = f"{text} {max(heads, key=lambda s: s['y'])['t']}".strip()
        # the product: nearest title above, in the same half of the page when two columns
        above = [t for t in titles if t['y'] < price['y'] and t['x'] < first_code_x]
        title = max(above, key=lambda t: (t['y'], t['x'])) if above else None
        subtitle = max([s for s in subs if s['y'] < price['y']], key=lambda s: s['y'], default=None)
        sub_now = subtitle['t'] if subtitle else sub
        key = (pno, title['t'] if title else None, round(title['y']) if title else None)
        prod = next((p for p in products if p['_key'] == key), None)
        if not prod:
            desc = []
            if title:
                # description: 8pt lines under the title, until the first price row or another title
                limit = min([t['y'] for t in titles if t['y'] > title['y'] + 1 and abs(t['x'] - title['x']) < 40] + [price['y']])
                for s in sorted(ss, key=lambda s: (s['y'], s['x'])):
                    if title['y'] < s['y'] < limit - 4 and 7.5 <= s['size'] <= 8.6 and abs(s['x'] - title['x']) < 25 and not PRICE.match(s['t']) and s['t'] not in ('Discount', 'Code', 'Unit £', 'group'):
                        desc.append(s['t'])
            prod = {'_key': key, 'page': pno + 1, 'family': family, 'subfamily': sub_now, 'title': title['t'] if title else None, 'description': ' '.join(desc), 'refs': []}
            products.append(prod)
        prod['refs'].append({'code': code['t'].replace(' ', ''), 'model': text, 'group': group[0]['t'] if group else None, 'priceGBP': float(price['t'].replace(',', ''))})
    if subs:
        sub = max(subs, key=lambda s: s['y'])['t']

for p in products:
    del p['_key']
refs = sum(len(p['refs']) for p in products)
codes = {r['code'] for p in products for r in p['refs']}
print(json.dumps({'products': len(products), 'refs': refs, 'uniqueCodes': len(codes), 'noTitle': sum(1 for p in products if not p['title']), 'noModel': sum(1 for p in products for r in p['refs'] if not r['model'])}, indent=1))
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(products, f, ensure_ascii=False, indent=1)
