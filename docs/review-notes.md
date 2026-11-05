# Android website: visual refresh only

The branch starts at main `f2e20f4da0dcaacbfb723e071ebb319820ac8236`. Publishing remains main/root with no custom domain. This branch is for owner and Claude review; it must not be merged automatically.

Six existing pages receive only a stylesheet link and a small presentation script. Removing those two tags restores the exact original HTML bytes, including translations, links, scripts, anchors, legal text and contacts. Existing logo files remain unchanged. No new WebGL, 3D library or business-site links are introduced.

Run from the repository root:

```powershell
python scripts/check-style-only.py
python scripts/check-urls.py
python -m http.server 4181 --bind 127.0.0.1
```

With Playwright installed in the sibling `tooling/site-qa` directory (or ACN_TOOL_DIR), run `node scripts/qa-apps.mjs`.

Evidence: `style-only-check.json` contains before/after SHA-256 for all 20 original files. `baseline/urls.json` records 51 IDs, seven legal blocks and six PDF hashes. `review/checks.json` records browser checks for desktop/mobile, incoming privacy/terms links, and SHA-256 comparisons of downloaded critical files. Screenshots are in `review/`.

Original legal blocks and baseline HTML copies are review artifacts, not replacements for the existing policy URLs. The live website changes only after the owner reviews and merges the PR.
