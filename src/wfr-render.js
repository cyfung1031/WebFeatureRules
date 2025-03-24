import { tokenize } from './wfr-parser.js';

// Enhanced patterns for internal regex highlighting
const REGEX_INTERNAL_PATTERNS = [
    { type: 'regex-escape', pattern: /^\\[\\\/\[\](){}|.^$*+?]/ },
    { type: 'regex-char-class-escape', pattern: /^\\[wWdDsS]/ },
    { type: 'regex-anchor', pattern: /^[\^$]|\\b|\\B/ },
    { type: 'regex-punctuation', pattern: /^[()[\]]/ },
    { type: 'regex-alternation', pattern: /^\|/ },
    { type: 'regex-punctuation', pattern: /^[{}]/ },
    { type: 'regex-quantifier', pattern: /^[?*+]/ },
    { type: 'regex-punctuation', pattern: /^\./ },
    { type: 'regex-literal', pattern: /^[^\\\s\/\[\](){}|.^$*+?]+/ },
    { type: 'unknown', pattern: /^./ }
];

// Tokenize internal regex pattern with nesting support
const tokenizeRegexPattern = (pattern) => {
    const tokens = [];
    let pos = 0;
    const stack = [];

    while (pos < pattern.length) {
        const slice = pattern.slice(pos);
        let matched = false;

        // Handle closing brackets in nested contexts
        if (stack.length > 0 && (slice[0] === ']' || slice[0] === '}')) {
            const top = stack[stack.length - 1];
            if ((top.opener === '[' && slice[0] === ']') || (top.opener === '{' && slice[0] === '}')) {
                tokens.push({ type: 'regex-punctuation', text: slice[0] });
                stack.pop();
                // Adjust for quantifiers like {1,2}
                if (
                    tokens.length >= 2 &&
                    tokens[tokens.length - 2].type === 'regex-punctuation' &&
                    tokens[tokens.length - 2].text === '{'
                ) {
                    const content = tokens[tokens.length - 1].text;
                    if (content.match(/^\d+(?:,\d*)?$/)) {
                        tokens[tokens.length - 2] = { type: 'regex-punctuation', text: '{' };
                        tokens[tokens.length - 1] = { type: 'regex-quantifier', text: content };
                        tokens[tokens.length] = { type: 'regex-punctuation', text: '}' };
                    }
                }
                pos++;
                matched = true;
            }
        }

        // Match patterns if no closing bracket
        if (!matched) {
            for (const { type, pattern: pat } of REGEX_INTERNAL_PATTERNS) {
                const match = slice.match(pat);
                if (match) {
                    const text = match[0];
                    if (type === 'regex-punctuation' && (text === '[' || text === '{')) {
                        stack.push({ opener: text, closer: text === '[' ? ']' : '}' });
                    }
                    tokens.push({ type, text });
                    pos += text.length;
                    matched = true;
                    break;
                }
            }
        }

        // Fallback for unmatched characters
        if (!matched) {
            tokens.push({ type: 'unknown', text: slice[0] });
            pos++;
        }
    }

    // Append closing brackets for unclosed structures
    while (stack.length > 0) {
        tokens.push({ type: 'regex-punctuation', text: stack.pop().closer });
    }

    return tokens;
};

// Render regex pattern as a document fragment
const renderRegexPattern = (text) => {
    const fragment = document.createDocumentFragment();

    // If text doesn’t start with '/', treat it as plain text
    if (!text.startsWith('/')) {
        fragment.appendChild(document.createTextNode(text));
        return fragment;
    }

    // Render the opening '/' for regex patterns
    const openingSlash = document.createElement('span');
    openingSlash.className = 'wfr-regex-punctuation';
    openingSlash.textContent = '/';
    fragment.appendChild(openingSlash);

    // Extract content after the opening '/'
    let patternText = text.slice(1);
    let flag = '';
    let hasClosingSlash = false;
    let inner = patternText;

    // Check for a flag (e.g., '/i')
    if (patternText.endsWith('/i')) {
        flag = 'i';
        inner = patternText.slice(0, -2); // Remove '/i' to get inner content
        hasClosingSlash = true;
    }
    // Check for a closing '/' without a flag
    else if (patternText.endsWith('/')) {
        inner = patternText.slice(0, -1); // Remove '/' to get inner content
        hasClosingSlash = true;
    }
    // If neither, inner is the full patternText (incomplete pattern)

    // Tokenize the inner content
    const tokens = tokenizeRegexPattern(inner);
    tokens.forEach((token) => {
        const span = document.createElement('span');
        span.className = `wfr-${token.type}`;
        span.textContent = token.text;
        fragment.appendChild(span);
    });

    // Add closing '/' only if it’s in the input
    if (hasClosingSlash) {
        const closingSlash = document.createElement('span');
        closingSlash.className = 'wfr-regex-punctuation';
        closingSlash.textContent = '/';
        fragment.appendChild(closingSlash);
    }

    // Add flag if present
    if (flag) {
        const flagSpan = document.createElement('span');
        flagSpan.className = 'wfr-regex-flag';
        flagSpan.textContent = flag;
        fragment.appendChild(flagSpan);
    }

    return fragment;
};

// Convert tokens to a document fragment
export function tokensToFragment(tokens) {
    const fragment = document.createDocumentFragment();
    tokens.forEach((token) => {
        if (token.type === 'whitespace') {
            fragment.appendChild(document.createTextNode(token.text));
        } else if (token.type === 'selector-regex-pattern' || token.type === 'feature-regex') {
            console.log(122, token.text, renderRegexPattern(token.text))
            fragment.appendChild(renderRegexPattern(token.text));
        } else {
            const span = document.createElement('span');
            let className = `wfr-${token.type}`;
            if (token.type.startsWith('comment')) className += ' wfr-comment';
            if (token.type === 'selector-regex-prefix') className += ' wfr-regex-prefix';
            span.className = className;
            span.textContent = token.text;
            fragment.appendChild(span);
        }
    });

    return fragment;
};

export function highlight(editor) {
    const code = editor.textContent;
    try {
        const tokens = tokenize(code);
        const fragment = tokensToFragment(tokens);
        editor.replaceChildren(fragment);
    } catch (error) {
        console.error('WFR highlighting error:', error);
        editor.textContent = code;
    }
}