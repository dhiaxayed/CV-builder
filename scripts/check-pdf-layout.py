"""Inspect actual PDF character positions. Requires scripts/requirements-pdf.txt."""
from pathlib import Path
import json
import sys
import pdfplumber

results = []
directory = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("output/pdf/templates")
for filename in sorted(directory.glob("*.pdf")):
    with pdfplumber.open(filename) as document:
        assert len(document.pages) == 1, f"{filename}: expected one page"
        chars = document.pages[0].chars
        page = document.pages[0]
        assert chars, f"{filename}: no extractable characters"
        outside = [char for char in chars if char["text"].strip() and (
            char["x0"] < -0.5 or char["x1"] > page.width + 0.5
            or char["top"] < -0.5 or char["bottom"] > page.height + 0.5)]
        assert not outside, f"{filename}: {len(outside)} characters outside page boundaries"
        assert page.hyperlinks, f"{filename}: missing live hyperlinks"
        results.append({"template": filename.stem, "pages": 1, "characters": len(chars),
                        "out_of_bounds": 0, "links": len(page.hyperlinks)})
assert len(results) == 16, f"Expected sixteen generated PDFs, found {len(results)}"
print(json.dumps(results, indent=2))
