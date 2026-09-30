# Maker catalogue → shop

Tools used to load the AstralPool 2025 catalogue (PDF) into the shop. They run on
a computer with Python 3 and `pip install pymupdf pillow`; the shop itself does
not use them.

1. **Products**: `python parse_catalogue.py catalogue.pdf catalogue.json` reads every
   priced reference (code, model, UK price) under its product, family and
   sub-family. `catalogue.json` is then turned into the Excel file that
   Admin → Products → **Import from Excel** takes (one row per code; columns
   *Code AstralPool*, *Catégorie boutique*, *Sous-famille*, *Produit*,
   *Modèle / version*, *Prix STES (TND TTC)*, *Stock*, *À vendre*, *Description*).
2. **Photos**: `python extract_photos.py catalogue.pdf catalogue.json photos/` saves
   one photo per product, named after its first code (`65557.jpg`). Send the
   whole folder with Admin → Products → **Import photos**.

The reading depends on the catalogue's layout (font sizes, columns), so check a
sample after each new edition. A high-resolution edition of the PDF gives
better photos: the 2025 "weblr" file only has small pictures.

Do not commit catalogue PDFs or the files made from them.
