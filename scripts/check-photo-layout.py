"""Check real photo PDFs: circular alpha, position, text bounds and collisions."""
from pathlib import Path
import json
import sys

import pdfplumber
from pdfminer.pdftypes import resolve1

directory = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("output/pdf/photos/tectonic")
manifest = json.loads(Path("public/templates/manifest.json").read_text())
expected = {f"{item['template']}-{side}" for item in manifest["templates"] for side in ("left", "right")}
files = sorted(directory.glob("*.pdf"))
assert {file.stem for file in files} == expected, "Both photo positions must cover the entire catalogue"
positions = {}
pages = 0
for filename in files:
    with pdfplumber.open(filename) as document:
        pages += len(document.pages)
        images = []
        for page in document.pages:
            for char in page.chars:
                if char["text"].strip():
                    assert -0.5 <= char["x0"] <= char["x1"] <= page.width + 0.5, f"{filename}: text outside page"
                    assert -0.5 <= char["top"] <= char["bottom"] <= page.height + 0.5, f"{filename}: text outside page"
            for image in page.images:
                images.append(image)
                assert abs(image["width"] - image["height"]) < 0.1, f"{filename}: distorted photo"
                assert 0 <= image["x0"] < image["x1"] <= page.width, f"{filename}: photo outside page"
                assert 0 <= image["top"] < image["bottom"] <= page.height, f"{filename}: photo outside page"
                for char in page.chars:
                    overlaps = (min(char["x1"], image["x1"]) - max(char["x0"], image["x0"]) > 0.5
                                and min(char["bottom"], image["bottom"]) - max(char["top"], image["top"]) > 0.5)
                    assert not (char["text"].strip() and overlaps), f"{filename}: photo overlaps text"
                mask = resolve1(image["stream"].attrs.get("SMask"))
                assert mask, f"{filename}: photo has no transparent mask"
                width, height = mask.attrs["Width"], mask.attrs["Height"]
                alpha = mask.get_data()
                assert len(alpha) == width * height, f"{filename}: unexpected alpha format"
                assert max(alpha[0], alpha[width - 1], alpha[-width], alpha[-1]) == 0, f"{filename}: square corners"
                assert alpha[(height // 2) * width + width // 2] == 255, f"{filename}: missing photo centre"
        assert len(images) == 1, f"{filename}: expected exactly one photo"
        positions[filename.stem] = images[0]["x0"]

for item in manifest["templates"]:
    template = item["template"]
    assert positions[f"{template}-right"] > positions[f"{template}-left"] + 20, f"{template}: photo position ignored"
print(json.dumps({"documents": len(files), "pages": pages, "positions": "left/right", "circular_alpha": True,
                  "text_collisions": 0, "out_of_bounds": 0}, indent=2))
