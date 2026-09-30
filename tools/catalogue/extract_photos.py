"""One photo per product from the AstralPool catalogue PDF, saved as
<first AstralPool code>.jpg, for Admin → Products → Import photos.

For each product (catalogue.json: page, title, codes), the photo is the
group of pictures in the left-hand column between its title and the next
title on the page. The region is rendered (so pictures made of several
pieces come out whole) at 300 dpi, trimmed and padded on white."""
import collections
import json
import os
import sys
import fitz
from PIL import Image, ImageChops

PDF, CATALOGUE, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(OUT, exist_ok=True)
doc = fitz.open(PDF)
products = json.load(open(CATALOGUE, encoding='utf-8'))

# Pictures repeated on many pages are decorations (logos, family icons)
freq = collections.Counter()
for p in doc:
    for x in {i['xref'] for i in p.get_image_info(xrefs=True) if i['xref']}:
        freq[x] += 1

def titles_on(page):
    out = []
    for b in page.get_text('dict')['blocks']:
        for l in b.get('lines', []):
            for s in l['spans']:
                t = s['text'].strip()
                if t and 9.3 <= s['size'] < 11.5 and s['bbox'][1] > 100:
                    out.append((t, fitz.Rect(s['bbox'])))
    return sorted(out, key=lambda t: t[1].y0)

def pictures_on(page):
    out = []
    for i in page.get_image_info(xrefs=True):
        r = fitz.Rect(i['bbox'])
        if r.width < 12 or r.height < 12 or r.y0 < 115:
            continue
        if i['xref'] and freq[i['xref']] > 3:
            continue
        if r.x0 > 490 and r.width < 60:  # family tab icon
            continue
        if r.width > 0.8 * page.rect.width:
            continue
        out.append(r)
    return out

def union(rects):
    u = fitz.Rect(rects[0])
    for r in rects[1:]:
        u |= r
    return u

def trim(img):
    # Crop the white margins, then pad to a square-ish frame
    bg = Image.new('RGB', img.size, (255, 255, 255))
    box = ImageChops.difference(img, bg).convert('L').point(lambda v: 255 if v > 18 else 0).getbbox()
    if box:
        img = img.crop(box)
    w, h = img.size
    side = int(max(w, h) * 1.12)
    frame = Image.new('RGB', (side, side), (255, 255, 255))
    frame.paste(img, ((side - w) // 2, (side - h) // 2))
    return frame

done, skipped = 0, []
cache = {}
for product in products:
    pno = product['page'] - 1
    if not product['title'] or not product['refs']:
        skipped.append((product['page'], product['title'], 'no title'))
        continue
    page = doc[pno]
    if pno not in cache:
        cache[pno] = (titles_on(page), pictures_on(page))
    titles, pictures = cache[pno]
    match = [r for t, r in titles if t == product['title']]
    if not match:
        skipped.append((product['page'], product['title'], 'title not found'))
        continue
    top = match[0]
    below = [r.y0 for t, r in titles if r.y0 > top.y1 + 2]
    bottom = min(below) if below else page.rect.height - 40
    band = fitz.Rect(0, top.y0 - 12, page.rect.width, bottom)
    inside = [r for r in pictures if band.contains(fitz.Point((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2))]
    # Photos sit in the left-hand column; wide pictures on the right are charts
    left = [r for r in inside if r.x1 <= 180 or (r.x0 < 170 and r.width < 200)]
    chosen = left or [r for r in inside if r.width < 230 and r.height < 230]
    if not chosen:
        skipped.append((product['page'], product['title'], 'no picture'))
        continue
    # The biggest picture and the pieces touching it
    main = max(chosen, key=lambda r: r.width * r.height)
    group = [main]
    grew = True
    while grew:
        grew = False
        box = union(group) + (-8, -8, 8, 8)
        for r in chosen:
            if r not in group and box.intersects(r):
                group.append(r)
                grew = True
    clip = union(group)
    if clip.width < 35 or clip.height < 35:
        skipped.append((product['page'], product['title'], 'too small'))
        continue
    pix = page.get_pixmap(clip=clip, dpi=300)
    img = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
    img = trim(img)
    if img.width > 900:
        img = img.resize((900, 900), Image.LANCZOS)
    code = product['refs'][0]['code']
    img.save(os.path.join(OUT, f'{code}.jpg'), quality=86, optimize=True)
    done += 1

print('photos', done, 'skipped', len(skipped))
for s in skipped[:40]:
    print('  ', s)
