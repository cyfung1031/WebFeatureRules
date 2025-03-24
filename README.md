# WfrSyntax

A lightweight JavaScript library for parsing and working with WebFeatureRules (WFR), a syntax for applying feature flags and settings based on URL patterns.

[![npm version](https://img.shields.io/npm/v/wfr-syntax.svg)](https://www.npmjs.com/package/wfr-syntax)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## What is WebFeatureRules (WFR)?

WebFeatureRules is a human-readable and editable syntax designed to apply or disable features on webpages based on their hostname, pathname, and query parameters. Inspired by tools like uBlock Origin, WFR offers:

- Simple glob-style patterns for regular users
- Powerful regex-based patterns for advanced users
- Intuitive selector syntax targeting URLs
- Extensible feature configuration

## Features

- 🔍 Parse WFR syntax into structured rule objects
- 🎯 Match URLs against rules with support for glob and regex patterns
- 🎨 Syntax highlighting for WFR code in HTML
- 📦 Multiple module formats (ESM, CJS, UMD, AMD)
- 🔄 Custom global variable naming for UMD builds
- 🛠️ Built with Vite for optimal performance and bundle size

## Installation

```bash
npm install wfr-syntax
```

## Usage

### ES Modules (recommended)

```javascript
import { parseRules, getFeatureValues } from 'wfr-syntax';

// Parse WFR rules
const wfrText = `
  [domain=example.com] {
    featureA: on;
  }
  
  [domain=example.com][path=/blog/*] {
    featureA: off;
    featureB: on;
  }
`;

const rules = parseRules(wfrText);

// Match a URL against rules to get feature values
const url = 'https://example.com/blog/post1';
const features = getFeatureValues(rules, url);
console.log(features); // { featureA: 'off', featureB: 'on' }
```

### CommonJS

```javascript
const { parseRules, getFeatureValues } = require('wfr-syntax');

// Same usage as ES Modules
```

### Browser (UMD)

```html
<!-- Default global name (WfrSyntax) -->
<script src="path/to/wfr-syntax.umd.cjs"></script>

<!-- Custom global name via query parameter -->
<script src="path/to/wfr-syntax.umd.cjs?globalName=MyCustomWfr"></script>

<!-- Custom global name via hash -->
<script src="path/to/wfr-syntax.umd.cjs#CustomWfr"></script>

<script>
  // Using default name
  const { parseRules, getFeatureValues } = WfrSyntax;
  
  // Or using custom name from query parameter
  const { parseRules, getFeatureValues } = MyCustomWfr;
  
  // Or using custom name from hash
  const { parseRules, getFeatureValues } = CustomWfr;
</script>
```

### Syntax Highlighting

The library includes a syntax highlighter that can be used in HTML:

```javascript
import { highlight } from 'wfr-syntax';

// Get an editor element
const editor = document.querySelector('.wfr-editor');

// Apply syntax highlighting
highlight(editor);

// You can also listen for input to continuously update highlighting
editor.addEventListener('input', () => {
  highlight(editor);
});
```

To use the syntax highlighting, include the CSS classes in your stylesheet:

```css
/* WFR Syntax Highlighting (Dark Theme) */
.wfr-comment { color: #608b4e; font-style: italic; }
.wfr-selector-bracket { color: #c586c0; font-weight: bold; }
.wfr-selector-attribute { color: #4fc1ff; }
.wfr-selector-operator { color: #d4d4d4; }
.wfr-selector-value { color: #ce9178; }
.wfr-selector-regex-prefix { color: #d7ba7d; font-weight: bold; }
.wfr-selector-regex-pattern { color: #d16969; }
.wfr-block-bracket { color: #c586c0; font-weight: bold; }
.wfr-feature-name { color: #9cdcfe; }
.wfr-feature-colon { color: #d4d4d4; }
.wfr-feature-value { color: #b5cea8; }
.wfr-feature-semicolon { color: #d4d4d4; }
.wfr-comma { color: #d4d4d4; }
```

## WFR Syntax Reference

### Basic Structure

A WFR rule consists of a **selector** and a **block**:

```
selector {
  feature1: value1;
  feature2: value2;
  ...
}
```

### Selectors

Selectors use conditions in the form `[attribute=value]` to match URLs:

- **AND Logic**: Multiple conditions in one selector must all match (e.g., `[domain=example.com][path=/blog/*]`).
- **OR Logic**: Comma-separated selectors mean any can match (e.g., `[domain=example.com], [domain=another.com]`).

#### Supported Attributes

1. **`host`**: Matches the exact hostname (e.g., `www.example.com`).
2. **`domain`**: Matches a domain and its subdomains (e.g., `example.com`, `www.example.com`).
3. **`path`**: Matches the pathname (e.g., `/blog/post`).
4. **`query.param`**: Matches a query parameter (e.g., `mode` in `?mode=debug`).

#### Pattern Types

1. **Simple Patterns** (glob-style):
   - Exact strings or wildcards (`*` for any characters, `?` for one character).
   - Example: `[path=/blog/*]` matches `/blog/post`, `/blog/sub/post`.

2. **Regular Expressions**:
   - Prefixed with `regex:`, `re:`, `:`, or `$`, followed by the pattern enclosed in `/`.
   - Example: `[domain=regex:/^(\w+\.)?example\.com$/]` matches `example.com`, `sub.example.com`.
   - Supports the `i` flag for case-insensitive matching (e.g., `[host=regex:/pattern/i]`).

### Features

Inside the `{}` block, list features and their values:
```
[domain=example.com] {
  featureX: on;
  featureY: off;
}
```

Common feature values are `on` or `off`, but can be customized based on your application's needs.

### Comments

WFR supports both single-line and multi-line comments:

```
// This is a single-line comment

/*
  This is a
  multi-line comment
*/
```

## API Reference

### `parseRules(wfrText)`

Parses WFR syntax text into an array of rule objects.

- **Parameters:**
  - `wfrText` (String): The WFR syntax text to parse.
- **Returns:** Array of rule objects, each with:
  - `selectors`: Array of selector groups
  - `features`: Object of feature name/value pairs

### `getFeatureValues(rules, url)`

Matches a URL against rules and returns the applicable feature values.

- **Parameters:**
  - `rules` (Array): Array of rule objects from `parseRules()`.
  - `url` (String): The URL to match against rules.
- **Returns:** Object containing feature name/value pairs.

### `tokenize(text)`

Tokenizes WFR syntax text for highlighting or custom processing.

- **Parameters:**
  - `text` (String): The WFR syntax text to tokenize.
- **Returns:** Array of token objects.

### `highlight(editor)`

Applies syntax highlighting to a DOM element containing WFR code.

- **Parameters:**
  - `editor` (Element): DOM element containing WFR code.

## Development

### Prerequisites

- Node.js 18+
- npm 8+

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/wfr-syntax.git
cd wfr-syntax

# Install dependencies
npm install
```

### Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production (ESM and UMD)
- `npm run build:all`: Build all formats (ESM, UMD, CJS, AMD)
- `npm run build:cjs`: Build only CommonJS format
- `npm run build:amd`: Build only AMD format
- `npm run test`: Run tests
- `npm run test:coverage`: Run tests with coverage

## License

MIT