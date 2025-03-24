// Glob Matching
function matchGlob(p, s) {
    const firstWild = Math.min(p.indexOf('*') + 1 || Infinity, p.indexOf('?') + 1 || Infinity) - 1;
    if (firstWild >= Infinity) return p === s;
    if (firstWild > 0 && !s.startsWith(p.substring(0, firstWild))) return false;

    const n = p.length, m = s.length;
    let top = 0;
    const stack = new Array(m - firstWild + 1);
    stack[0] = { i: firstWild, j: firstWild };

    while (top >= 0) {
        let { i, j } = stack[top--];
        while (i < n && p.charCodeAt(i) !== 42 && p.charCodeAt(i) !== 63) {
            if (j >= m || p.charCodeAt(i) !== s.charCodeAt(j)) break;
            i++; j++;
        }
        if (i === n) {
            if (j === m) return true;
            continue;
        }

        let c = p.charCodeAt(i);
        if (c === 42) {
            if (i + 1 < n && p.charCodeAt(i + 1) === 42) {
                i += 2;
                if (i >= n) return true;
                for (let x = m; x >= j; x--) {
                    stack[++top] = { i, j: x };
                }
            } else {
                i++;
                let end = j;
                while (end < m && s.charCodeAt(end) !== 47 && s.charCodeAt(end) !== 46) end++;
                if (i === n) {
                    if (end === m) return true;
                    continue;
                }
                for (let x = end; x >= j; x--) {
                    stack[++top] = { i, j: x };
                }
            }
        } else if (c === 63) {
            if (j < m && s.charCodeAt(j) !== 47 && s.charCodeAt(j) !== 46) {
                stack[++top] = { i: i + 1, j: j + 1 };
            }
        }
    }
    return false;
}

// Parse Regex
function parseRegex(value) {
    if (typeof value !== 'string') return null;
    const offset = value.indexOf('/');
    if (offset === 6 && value.startsWith("regex:")) {
    } else if (offset === 3 && value.startsWith("re:")) {
    } else if (offset === 1 && (value[0] === ':' || value[0] === '$')) {
    } else {
        return null;
    }
    const start = offset + 1;
    const end = value.lastIndexOf('/');
    if (end <= start) return null;
    const patternStr = value.slice(start, end);
    const flags = value.slice(end + 1);
    try {
        return new RegExp(patternStr, flags);
    } catch (e) {
        return null;
    }
}

// Tokenize
function tokenize(text) {
    const tokens = [];
    for (let i = 0, len = text.length; i < len;) {
        let c = text[i];
        if (c <= ' ') { i++; continue; }
        if (c === '/') {
            if (text[i + 1] === '/') { i = (text.indexOf('\n', i + 2) + 1) || len; continue; }
            if (text[i + 1] === '*') { i = ((text.indexOf('*/', i + 2) + 1) || len + 1); continue; }
        } else if ('[]{}:;,'.includes(c)) { tokens.push(c); i++; continue; }
        else if (c === '=') {
            tokens.push('=');
            i++;
            let slashPos = text.indexOf('/', i);
            if (slashPos > i && slashPos < i + 8) {
                const regexMatch = text.slice(i).match(/^(?:regex:|re:|[:$])\/.*?(?:\/[a-z]*)?(?=[\s\]\},;]|$)/i);
                if (regexMatch) { tokens.push(regexMatch[0]); i += regexMatch[0].length; continue; }
            }
        }
        const start = i;
        while (i < len && text[i] > ' ' && !'[]{}:;,='.includes(text[i])) i++;
        if (i > start) tokens.push(text.slice(start, i));
    }
    return tokens;
}

// Parse Rules
function parseRules(text) {
    const tokens = tokenize(text), rules = [];
    for (let i = 0, len = tokens.length; i < len;) {
        if (tokens[i] === '[') {
            const groups = [[]];
            try {
                while (i < len && tokens[i] !== '{') {
                    if (tokens[i] === '[') {
                        const attr = tokens[++i]; i++;
                        if (!attr) throw new Error('Missing attribute');
                        let value = null, isRegex = false;
                        if (tokens[i] === '=') {
                            value = tokens[++i]; i++;
                            const rx = parseRegex(value);
                            if (rx) { value = rx; isRegex = true; }
                        } else if (!attr.startsWith('query.')) throw new Error('Expected "="');
                        if (tokens[i++] !== ']') throw new Error('Missing "]"');
                        groups[groups.length - 1].push({ attr, value, isRegex });
                    } else if (tokens[i] === ',') {
                        groups.push([]);
                        i++;
                    } else throw new Error('Invalid selector');
                }
                if (tokens[i++] !== '{') throw new Error('Missing "{"');
                const features = {};
                while (i < len && tokens[i] !== '}') {
                    const name = tokens[i++], colon = tokens[i++], value = tokens[i++], semi = tokens[i++];
                    if (colon !== ':' || semi !== ';') throw new Error('Invalid feature');
                    features[name] = value;
                }
                if (tokens[i++] !== '}') throw new Error('Missing "}"');
                rules.push({ selectors: groups.filter(g => g.length), features });
            } catch (e) {
                while (i < len && tokens[i] !== '[') i++;
            }
        } else i++;
    }
    return rules;
}

// Match Condition
function matchCondition({ attr, value, isRegex }, { host, pathname, searchParams }) {
    if (attr === 'host') return isRegex ? value.test(host) : matchGlob(value, host);
    if (attr === 'path') return isRegex ? value.test(pathname) : matchGlob(value, pathname);
    if (attr === 'domain') {
        const domain = host.split('.').slice(-2).join('.');
        return isRegex ? value.test(host) : matchGlob(value, domain);
    }
    if (attr.startsWith('query.')) {
        const param = searchParams.get(attr.slice(6));
        return value === null ? param !== null : param && (isRegex ? value.test(param) : matchGlob(value, param));
    }
    return false;
}

// Apply Rules
function getFeatureValues(rules, urlObj) {
    const features = {};
    for (const rule of rules) {
        if (rule.selectors.some(group => group.every(cond => matchCondition(cond, urlObj)))) {
            Object.assign(features, rule.features);
        }
    }
    return features;
}

// Export as ES Module
export function getWfrFeatures(text, url) {
    try {
        const urlObj = new URL(url);
        return getFeatureValues(parseRules(text), urlObj);
    } catch (_) {
        return {};
    }
}