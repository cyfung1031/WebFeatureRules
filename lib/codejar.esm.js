/*
MIT License

Copyright (c) 2020 Anton Medvedev
Copyright (c) 2025 CY Fung

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

// https://cdn.jsdelivr.net/npm/codejar@4.2.0/dist/codejar.js

const globalWindow = window;
export function CodeJar(editor, highlight, opt = {}) {
    const options = {
        tab: '\t',
        indentOn: /[({\[]$/,
        moveToNewLine: /^[)}\]]/,
        spellcheck: false,
        catchTab: true,
        preserveIdent: true,
        addClosing: true,
        history: true,
        window: globalWindow,
        bracketMatchingClass: 'matching',
        bracketMatching: false, // New option for bracket matching
        ...opt,
    };
    const window = options.window;
    const document = window.document;
    const listeners = [];
    const history = [];
    let at = -1;
    let focus = false;
    let onUpdate = () => void 0;
    let prev; // code content prior keydown event

    // Variables for bracket matching
    let bracketMap = [];      // Array of bracket objects: {pos, bracket, node}
    let matchingMap = {};     // Map of bracket position to its matching position
    let highlightedNodes = []; // Nodes currently highlighted

    editor.setAttribute('contenteditable', 'plaintext-only');
    editor.setAttribute('spellcheck', options.spellcheck ? 'true' : 'false');
    editor.style.outline = 'none';
    editor.style.overflowWrap = 'break-word';
    editor.style.overflowY = 'auto';
    editor.style.whiteSpace = 'pre-wrap';

    let isLegacy = false; // true if plaintext-only is not supported
    if (editor.contentEditable !== 'plaintext-only') {
        isLegacy = true;
        editor.setAttribute('contenteditable', 'true');
    }

    const doHighlight = (editor, pos) => {
        highlight(editor, pos);
        if (options.bracketMatching) {
            bracketMap = getBracketMap();
            matchingMap = buildMatchingMap(bracketMap);
        }
    };

    const debounceHighlight = debounce(() => {
        const pos = save();
        doHighlight(editor, pos);
        restore(pos);
    }, 30);

    let recording = false;
    const shouldRecord = (event) => {
        return !isUndo(event) && !isRedo(event)
            && event.key !== 'Meta'
            && event.key !== 'Control'
            && event.key !== 'Alt'
            && !event.key.startsWith('Arrow');
    };

    const debounceRecordHistory = debounce((event) => {
        if (shouldRecord(event)) {
            recordHistory();
            recording = false;
        }
    }, 300);

    const on = (type, fn) => {
        listeners.push([type, fn]);
        editor.addEventListener(type, fn);
    };

    // Debounced function for bracket matching
    const debounceBracketMatching = debounce(() => {
        if (!options.bracketMatching) return;

        // Clear previous highlights
        highlightedNodes.forEach(node => node.classList.remove(options.bracketMatchingClass));
        highlightedNodes = [];

        // Get current selection and ensure it's a single cursor position.
        const s = getSelection();
        if (s.rangeCount === 0) return;
        const range = s.getRangeAt(0);
        if (!range.collapsed) return; // Only highlight when there's a single caret

        const pos = save();
        const cursorPos = pos.start;

        // Determine which bracket pair to highlight based on VS Code–like behavior.
        const pairPositions = findBracketPair(cursorPos);

        if (pairPositions.length) {
            for (const position of pairPositions) {
                const bracket = bracketMap.find(b => b.pos === position);
                if (bracket) {
                    bracket.node.classList.add(options.bracketMatchingClass);
                    highlightedNodes.push(bracket.node);
                }
            }
        }
    }, 30);

    function findBracketPair(cursorPos) {
        // Check for adjacent brackets first.
        const before = bracketMap.find(b => b.pos === cursorPos - 1);
        const after = bracketMap.find(b => b.pos === cursorPos);

        // If a closing bracket is immediately after the cursor, prefer that.
        if (after && '}])'.includes(after.bracket)) {
            const match = matchingMap[after.pos];
            if (match !== undefined) {
                return [match, after.pos];
            }
        }
        // Otherwise, if an opening bracket is immediately before the cursor, use that.
        if (before && '{[('.includes(before.bracket)) {
            const match = matchingMap[before.pos];
            if (match !== undefined) {
                return [before.pos, match];
            }
        }

        // If no adjacent bracket is found, search for an enclosing pair.
        let candidate = null;
        for (const b of bracketMap) {
            if ('{[('.includes(b.bracket)) {
                const openPos = b.pos;
                const closePos = matchingMap[openPos];
                // Check if the cursor lies strictly between the opening and closing bracket.
                if (openPos < cursorPos && closePos > cursorPos) {
                    // Choose the innermost (closest) enclosing pair.
                    if (!candidate || openPos > candidate.open) {
                        candidate = { open: openPos, close: closePos };
                    }
                }
            }
        }
        if (candidate) {
            return [candidate.open, candidate.close];
        }
        return [];
    }


    on('keydown', event => {
        if (event.defaultPrevented) return;
        prev = toString();
        if (options.preserveIdent) handleNewLine(event);
        else legacyNewLineFix(event);
        if (options.catchTab) handleTabCharacters(event);
        if (options.addClosing) handleSelfClosingCharacters(event);
        if (options.history) {
            handleUndoRedo(event);
            if (shouldRecord(event) && !recording) {
                recordHistory();
                recording = true;
            }
        }
        if (isLegacy && !isCopy(event)) restore(save());
    });

    on('keyup', event => {
        if (event.defaultPrevented || event.isComposing) return;
        if (prev !== toString()) debounceHighlight();
        debounceRecordHistory(event);
        onUpdate(toString());
    });

    on('focus', _event => {
        focus = true;
    });

    on('blur', _event => {
        focus = false;
    });

    on('paste', event => {
        recordHistory();
        handlePaste(event);
        recordHistory();
        onUpdate(toString());
    });

    on('cut', event => {
        recordHistory();
        handleCut(event);
        recordHistory();
        onUpdate(toString());
    });

    // Add bracket matching listeners if enabled
    if (options.bracketMatching) {
        on('keyup', debounceBracketMatching);
        on('mouseup', debounceBracketMatching);
    }

    function save() {
        const s = getSelection();
        const pos = { start: 0, end: 0, dir: undefined };
        let { anchorNode, anchorOffset, focusNode, focusOffset } = s;
        if (!anchorNode || !focusNode) throw 'error1';
        if (anchorNode === editor && focusNode === editor) {
            pos.start = (anchorOffset > 0 && editor.textContent) ? editor.textContent.length : 0;
            pos.end = (focusOffset > 0 && editor.textContent) ? editor.textContent.length : 0;
            pos.dir = (focusOffset >= anchorOffset) ? '->' : '<-';
            return pos;
        }
        if (anchorNode.nodeType === Node.ELEMENT_NODE) {
            const node = document.createTextNode('');
            anchorNode.insertBefore(node, anchorNode.childNodes[anchorOffset]);
            anchorNode = node;
            anchorOffset = 0;
        }
        if (focusNode.nodeType === Node.ELEMENT_NODE) {
            const node = document.createTextNode('');
            focusNode.insertBefore(node, focusNode.childNodes[focusOffset]);
            focusNode = node;
            focusOffset = 0;
        }
        visit(editor, el => {
            if (el === anchorNode && el === focusNode) {
                pos.start += anchorOffset;
                pos.end += focusOffset;
                pos.dir = anchorOffset <= focusOffset ? '->' : '<-';
                return 'stop';
            }
            if (el === anchorNode) {
                pos.start += anchorOffset;
                if (!pos.dir) pos.dir = '->';
                else return 'stop';
            } else if (el === focusNode) {
                pos.end += focusOffset;
                if (!pos.dir) pos.dir = '<-';
                else return 'stop';
            }
            if (el.nodeType === Node.TEXT_NODE) {
                if (pos.dir != '->') pos.start += el.nodeValue.length;
                if (pos.dir != '<-') pos.end += el.nodeValue.length;
            }
        });
        editor.normalize();
        return pos;
    }

    function restore(pos) {
        const s = getSelection();
        let startNode, startOffset = 0;
        let endNode, endOffset = 0;
        if (!pos.dir) pos.dir = '->';
        if (pos.start < 0) pos.start = 0;
        if (pos.end < 0) pos.end = 0;
        if (pos.dir == '<-') {
            const { start, end } = pos;
            pos.start = end;
            pos.end = start;
        }
        let current = 0;
        visit(editor, el => {
            if (el.nodeType !== Node.TEXT_NODE) return;
            const len = (el.nodeValue || '').length;
            if (current + len > pos.start) {
                if (!startNode) {
                    startNode = el;
                    startOffset = pos.start - current;
                }
                if (current + len > pos.end) {
                    endNode = el;
                    endOffset = pos.end - current;
                    return 'stop';
                }
            }
            current += len;
        });
        if (!startNode) startNode = editor, startOffset = editor.childNodes.length;
        if (!endNode) endNode = editor, endOffset = editor.childNodes.length;
        if (pos.dir == '<-') {
            [startNode, startOffset, endNode, endOffset] = [endNode, endOffset, startNode, startOffset];
        }
        {
            const startEl = uneditable(startNode);
            if (startEl) {
                const node = document.createTextNode('');
                startEl.parentNode?.insertBefore(node, startEl);
                startNode = node;
                startOffset = 0;
            }
            const endEl = uneditable(endNode);
            if (endEl) {
                const node = document.createTextNode('');
                endEl.parentNode?.insertBefore(node, endEl);
                endNode = node;
                endOffset = 0;
            }
        }
        s.setBaseAndExtent(startNode, startOffset, endNode, endOffset);
        editor.normalize();
    }

    function uneditable(node) {
        while (node && node !== editor) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node;
                if (el.getAttribute('contenteditable') == 'false') return el;
            }
            node = node.parentNode;
        }
    }

    function beforeCursor() {
        const s = getSelection();
        const r0 = s.getRangeAt(0);
        const r = document.createRange();
        r.selectNodeContents(editor);
        r.setEnd(r0.startContainer, r0.startOffset);
        return r.toString();
    }

    function afterCursor() {
        const s = getSelection();
        const r0 = s.getRangeAt(0);
        const r = document.createRange();
        r.selectNodeContents(editor);
        r.setStart(r0.endContainer, r0.endOffset);
        return r.toString();
    }

    function handleNewLine(event) {
        if (event.key === 'Enter') {
            const before = beforeCursor();
            const after = afterCursor();
            let [padding] = findPadding(before);
            let newLinePadding = padding;
            if (options.indentOn.test(before)) {
                newLinePadding += options.tab;
            }
            if (newLinePadding.length > 0) {
                preventDefault(event);
                event.stopPropagation();
                insert('\n' + newLinePadding);
            } else {
                legacyNewLineFix(event);
            }
            if (newLinePadding !== padding && options.moveToNewLine.test(after)) {
                const pos = save();
                insert('\n' + padding);
                restore(pos);
            }
        }
    }

    function legacyNewLineFix(event) {
        if (isLegacy && event.key === 'Enter') {
            preventDefault(event);
            event.stopPropagation();
            if (afterCursor() == '') {
                insert('\n ');
                const pos = save();
                pos.start = --pos.end;
                restore(pos);
            } else {
                insert('\n');
            }
        }
    }

    function handleSelfClosingCharacters(event) {
        const open = `([{'"`;
        const close = `)]}'"`;
        if (open.includes(event.key)) {
            preventDefault(event);
            const pos = save();
            const wrapText = pos.start == pos.end ? '' : getSelection().toString();
            const text = event.key + wrapText + close[open.indexOf(event.key)];
            insert(text);
            pos.start++;
            pos.end++;
            restore(pos);
        }
    }

    function handleTabCharacters(event) {
        if (event.key === 'Tab') {
            preventDefault(event);
            if (event.shiftKey) {
                const before = beforeCursor();
                let [padding, start] = findPadding(before);
                if (padding.length > 0) {
                    const pos = save();
                    const len = Math.min(options.tab.length, padding.length);
                    restore({ start, end: start + len });
                    document.execCommand('delete');
                    pos.start -= len;
                    pos.end -= len;
                    restore(pos);
                }
            } else {
                insert(options.tab);
            }
        }
    }

    function handleUndoRedo(event) {
        if (isUndo(event)) {
            preventDefault(event);
            at--;
            const record = history[at];
            if (record) {
                editor.innerHTML = record.html;
                restore(record.pos);
            }
            if (at < 0) at = 0;
        }
        if (isRedo(event)) {
            preventDefault(event);
            at++;
            const record = history[at];
            if (record) {
                editor.innerHTML = record.html;
                restore(record.pos);
            }
            if (at >= history.length) at--;
        }
    }

    function recordHistory() {
        if (!focus) return;
        const html = editor.innerHTML;
        const pos = save();
        const lastRecord = history[at];
        if (lastRecord) {
            if (lastRecord.html === html
                && lastRecord.pos.start === pos.start
                && lastRecord.pos.end === pos.end) return;
        }
        at++;
        history[at] = { html, pos };
        history.splice(at + 1);
        const maxHistory = 300;
        if (at > maxHistory) {
            at = maxHistory;
            history.splice(0, 1);
        }
    }

    function handlePaste(event) {
        if (event.defaultPrevented) return;
        preventDefault(event);
        const originalEvent = event.originalEvent ?? event;
        const text = originalEvent.clipboardData.getData('text/plain').replace(/\r\n?/g, '\n');
        const pos = save();
        insert(text);
        doHighlight(editor);
        restore({
            start: Math.min(pos.start, pos.end) + text.length,
            end: Math.min(pos.start, pos.end) + text.length,
            dir: '<-',
        });
    }

    function handleCut(event) {
        const pos = save();
        const selection = getSelection();
        const originalEvent = event.originalEvent ?? event;
        originalEvent.clipboardData.setData('text/plain', selection.toString());
        document.execCommand('delete');
        doHighlight(editor);
        restore({
            start: Math.min(pos.start, pos.end),
            end: Math.min(pos.start, pos.end),
            dir: '<-',
        });
        preventDefault(event);
    }

    function visit(editor, visitor) {
        const queue = [];
        if (editor.firstChild) queue.push(editor.firstChild);
        let el = queue.pop();
        while (el) {
            if (visitor(el) === 'stop') break;
            if (el.nextSibling) queue.push(el.nextSibling);
            if (el.firstChild) queue.push(el.firstChild);
            el = queue.pop();
        }
    }

    function getBracketMap() {
        const brackets = [];
        let pos = 0;

        function traverse(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                pos += node.nodeValue.length;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                // If it's a SPAN and qualifies as a bracket token.
                if (node.tagName === 'SPAN' && node.childNodes.length === 1 && node.firstChild.nodeType === Node.TEXT_NODE) {
                    const text = node.textContent;
                    if (text.length === 1 && '{[()]}'.includes(text)) {
                        brackets.push({ pos: pos, bracket: text, node });
                        pos += 1;
                        return; // Skip traversing children, we've handled the token.
                    }
                }
                // For non-bracket elements or multi-character spans, traverse children.
                for (let i = 0; i < node.childNodes.length; i++) {
                    traverse(node.childNodes[i]);
                }
            }
        }

        traverse(editor);
        return brackets;
    }



    function buildMatchingMap(brackets) {
        const matching = {};
        const stack = [];
        const bracketPairs = {
            '(': ')',
            '[': ']',
            '{': '}'
        };

        for (const bracket of brackets) {
            if (bracket.bracket in bracketPairs) {
                // Opening bracket: push it onto the stack.
                stack.push(bracket);
            } else {
                // Closing bracket: iterate backward in the stack to find a matching opening bracket.
                for (let i = stack.length - 1; i >= 0; i--) {
                    if (bracketPairs[stack[i].bracket] === bracket.bracket) {
                        const openBracket = stack.splice(i, 1)[0];
                        matching[openBracket.pos] = bracket.pos;
                        matching[bracket.pos] = openBracket.pos;
                        break;
                    }
                }
            }
        }
        return matching;
    }



    function isCtrl(event) {
        return event.metaKey || event.ctrlKey;
    }

    function isUndo(event) {
        return isCtrl(event) && !event.shiftKey && getKeyCode(event) === 'Z';
    }

    function isRedo(event) {
        return isCtrl(event) && event.shiftKey && getKeyCode(event) === 'Z';
    }

    function isCopy(event) {
        return isCtrl(event) && getKeyCode(event) === 'C';
    }

    function getKeyCode(event) {
        let key = event.key || event.keyCode || event.which;
        if (!key) return undefined;
        return (typeof key === 'string' ? key : String.fromCharCode(key)).toUpperCase();
    }

    function insert(text) {
        text = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        document.execCommand('insertHTML', false, text);
    }

    function debounce(cb, wait) {
        let timeout = 0;
        return (...args) => {
            clearTimeout(timeout);
            timeout = window.setTimeout(() => cb(...args), wait);
        };
    }

    function findPadding(text) {
        let i = text.length - 1;
        while (i >= 0 && text[i] !== '\n') i--;
        i++;
        let j = i;
        while (j < text.length && /[ \t]/.test(text[j])) j++;
        return [text.substring(i, j) || '', i, j];
    }

    function toString() {
        return editor.textContent || '';
    }

    function preventDefault(event) {
        event.preventDefault();
    }

    function getSelection() {
        if (editor.parentNode?.nodeType == Node.DOCUMENT_FRAGMENT_NODE) {
            return editor.parentNode.getSelection();
        }
        return window.getSelection();
    }

    return {
        updateOptions(newOptions) {
            Object.assign(options, newOptions);
        },
        updateCode(code) {
            editor.textContent = code;
            doHighlight(editor);
            onUpdate(code);
        },
        onUpdate(callback) {
            onUpdate = callback;
        },
        toString,
        save,
        restore,
        recordHistory,
        destroy() {
            for (let [type, fn] of listeners) {
                editor.removeEventListener(type, fn);
            }
        },
    };
}
