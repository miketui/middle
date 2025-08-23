# EPUB Chapter Conversion Tooling

This repository converts Markdown chapters into EPUB-ready XHTML and generates HTML canvases for preview. The tooling focuses on maintaining exact content fidelity while applying consistent EPUB layout standards.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Bootstrap and Setup
Run the setup script to initialize the project:
```bash
chmod +x tools/update-setup.sh
./tools/update-setup.sh
```
- **NEVER CANCEL**: Setup takes ~11 seconds. Set timeout to 30+ seconds.
- Creates directory structure, installs dependencies, and configures npm scripts.

### Install Dependencies
```bash
npm install
```
- **Timing**: Takes ~3 seconds. Set timeout to 30+ seconds.
- Installs: jsdom, marked, gray-matter, yaml, he, js-yaml, fast-glob, markdown-it, markdown-it-footnote

### Build and Convert All Chapters
```bash
npm run convert:chapters
```
- **NEVER CANCEL**: Takes ~1.4 seconds for 15+ chapters. Set timeout to 60+ seconds for safety.
- Converts all `.md` files from `OEBPS/chapters_src/` to `.xhtml` in `OEBPS/complete/`

### Generate Preview Canvases
```bash
npm run make:canvases
```
- **Timing**: Takes ~0.2 seconds. Set timeout to 30+ seconds.
- Creates `.html` preview files in `OEBPS/react/`

### Quality Assurance Checks
```bash
npm run qa "OEBPS/complete/*.xhtml"
```
- **NEVER CANCEL**: Takes ~1.3 seconds. Set timeout to 60+ seconds.
- Validates XHTML structure, CSS links, footnotes, and asset references
- Must pass before considering work complete

## Validation

### Complete Development Workflow
Always run this sequence after making changes:
```bash
npm run convert:chapters && npm run make:canvases && npm run qa "OEBPS/complete/*.xhtml"
```
- **NEVER CANCEL**: Total time ~3 seconds. Set timeout to 120+ seconds.
- This is the standard validation sequence

### Manual Preview Testing
Start a local server to preview generated content:
```bash
cd OEBPS/react
python3 -m http.server 8080
```
- Open http://localhost:8080/ in browser
- Select any `*_canvas.html` file to preview rendered chapters
- Verify chapter styling, fonts, and layout match expectations

### Individual Chapter Conversion
For single chapter conversion:
```bash
node tools/md-to-xhtml.js \
  --in OEBPS/chapters_src/[CHAPTER].md \
  --out /tmp/test-chapter.xhtml \
  --roman [ROMAN_NUMERAL] \
  --title "[CHAPTER_TITLE]"
```
- **Timing**: Takes <1 second per chapter
- Use for targeted testing of specific chapters

### Individual Canvas Generation
```bash
node tools/make-canvas.js \
  --xhtml OEBPS/complete/[CHAPTER].xhtml \
  --out /tmp/test-canvas.html
```
- **Timing**: Takes <1 second per canvas
- Creates standalone HTML preview of single chapter

## Common Tasks

### Directory Structure
```
.
├── .github/                    # CI/CD workflows
├── OEBPS/                      # EPUB content root
│   ├── chapters_src/           # Source Markdown files
│   ├── complete/              # Generated XHTML files  
│   ├── react/                 # HTML canvas previews
│   ├── styles/                # CSS files (fonts.css, style.css)
│   ├── images/                # Image assets (.JPEG, .PNG)
│   └── fonts/                 # Font files
├── tools/                     # Conversion scripts
│   ├── convert-all.mjs        # Batch converter
│   ├── make-canvases.mjs      # Batch canvas generator
│   ├── md-to-xhtml.js         # Single chapter converter
│   ├── make-canvas.js         # Single canvas generator
│   ├── qa-checks.js           # Quality assurance
│   └── update-setup.sh        # Project setup script
├── package.json               # Dependencies and scripts
└── README.md                  # Basic documentation
```

### NPM Scripts Available
- `npm run convert:chapters` - Convert all Markdown to XHTML
- `npm run make:canvases` - Generate all HTML previews  
- `npm run convert` - Single chapter conversion (manual tool)
- `npm run qa` - Quality assurance checks
- `npm run canvas` - Single canvas generation (manual tool)

### Required Assets
All required CSS and image assets are present:
- **CSS**: `OEBPS/styles/fonts.css`, `OEBPS/styles/style.css`
- **Images**: `OEBPS/images/brushstroke.JPEG`, chapter quote images, etc.
- QA checks will fail if any referenced assets are missing

### Key Files to Monitor
- `package.json` - Contains all scripts and dependencies
- `tools/templates/golden-chapter.xhtml` - Template for all chapters
- `OEBPS/book-map.yaml` - Chapter metadata and asset mappings (optional)

## Technology Stack
- **Node.js**: v20.19.4 required
- **npm**: 10.8.2
- **Module System**: ES modules (`"type": "module"` in package.json)
- **Key Dependencies**: jsdom, marked, gray-matter, yaml, markdown-it

## Troubleshooting

### Fix ES Module Issues (Known Issue)
If QA checks fail with "require is not defined", fix the ES module compatibility:
```bash
# Convert qa-checks.js to use ES modules
sed -i 's/const fs = require('\''fs'\'');/import fs from '\''fs'\'';/' tools/qa-checks.js
sed -i 's/const path = require('\''path'\'');/import path from '\''path'\'';/' tools/qa-checks.js  
sed -i 's/const { JSDOM } = require('\''jsdom'\'');/import { JSDOM } from '\''jsdom'\'';/' tools/qa-checks.js
sed -i 's/const fg = require('\''fast-glob'\'');/import fg from '\''fast-glob'\'';/' tools/qa-checks.js
```
- **TIMING**: Takes <1 second to fix
- This converts CommonJS requires to ES module imports
- After fix, QA checks will work correctly

### Fix Individual Tools (If Needed)
If individual conversion tools fail with similar errors:
```bash
# Fix md-to-xhtml.js
sed -i 's/const fs = require('\''fs'\'');/import fs from '\''fs'\'';/' tools/md-to-xhtml.js
sed -i 's/const path = require('\''path'\'');/import path from '\''path'\'';/' tools/md-to-xhtml.js
sed -i 's/const yaml = require('\''js-yaml'\'');/import yaml from '\''js-yaml'\'';/' tools/md-to-xhtml.js
sed -i 's/const { JSDOM } = require('\''jsdom'\'');/import { JSDOM } from '\''jsdom'\'';/' tools/md-to-xhtml.js
sed -i 's/const he = require('\''he'\'');/import he from '\''he'\'';/' tools/md-to-xhtml.js
sed -i 's/const fg = require('\''fast-glob'\'');/import fg from '\''fast-glob'\'';/' tools/md-to-xhtml.js
sed -i 's/const MarkdownIt = require('\''markdown-it'\'');/import MarkdownIt from '\''markdown-it'\'';/' tools/md-to-xhtml.js
sed -i 's/const mdFootnote = require('\''markdown-it-footnote'\'');/import mdFootnote from '\''markdown-it-footnote'\'';/' tools/md-to-xhtml.js

# Fix make-canvas.js  
sed -i 's/const fs = require('\''fs'\'');/import fs from '\''fs'\'';/' tools/make-canvas.js
sed -i 's/const path = require('\''path'\'');/import path from '\''path'\'';/' tools/make-canvas.js

# Install missing dependencies
npm install he js-yaml fast-glob markdown-it markdown-it-footnote
```

### Other Common Issues
- If dependencies are missing, run `npm install` 
- If setup fails, ensure `tools/update-setup.sh` has execute permissions: `chmod +x tools/update-setup.sh`
- If QA fails, check that all referenced images exist in `OEBPS/images/`
- If canvas previews don't render properly, verify CSS files are present

## CRITICAL Timing Guidelines
- **NEVER CANCEL any build or conversion command** - All operations complete in under 15 seconds
- **Setup script**: 11 seconds, set 30+ second timeout
- **Chapter conversion**: 1.4 seconds, set 60+ second timeout  
- **Canvas generation**: 0.2 seconds, set 30+ second timeout
- **QA checks**: 1.3 seconds, set 60+ second timeout
- **Complete workflow**: ~3 seconds total, set 120+ second timeout