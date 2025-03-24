// --- WebFeatureRules Parser ---

const tokenPatterns = [
  { type: "comment", pattern: /^\/\/.*(?:\n|$)/ },
  { type: "comment-start", pattern: /^\/\*/ },
  { type: "comment-end", pattern: /^\*\// },
  { type: "comment-content", pattern: /^(?:[^\*]+|\*(?!\/))/ },
  { type: "selector-bracket", pattern: /^[\[\]]/ },
  { type: "selector-attribute", pattern: /^[\w.]*(?=\s*(?:=|\]))/ },
  { type: "selector-operator", pattern: /^=/ },
  { type: "selector-regex-prefix", pattern: /^(regex:|re:|[:$])/ },
  { type: "selector-regex-pattern", pattern: /^\/[^]*?(?=[\[\]\s,{}])/ }, // Updated: Match until boundary
  { type: "selector-value", pattern: /^(?:"[^"]*"|'[^']*'|[^,\s\[\]{}]+)/ },
  { type: "block-bracket", pattern: /^[\{\}]/ },
  { type: "feature-name", pattern: /^[\w-]+(?=\s*:)/ },
  { type: "feature-colon", pattern: /^:/ },
  { type: "feature-value", pattern: /^(?:on|off|\d+(?:\.\d+)?(?:px|em|rem|%)?|"[^"]*"|'[^']*')(?=\s*;)/ },
  { type: "feature-semicolon", pattern: /^;/ },
  { type: "comma", pattern: /^,/ },
  { type: "whitespace", pattern: /^\s+/ },
  { type: "unknown", pattern: /^./ },
];

const validAttributeNames = ["host", "domain", "path", "query"];

const tokenTypes = {
  "comment": 4,
  "comment-start": 4,
  "comment-end": 1 | 2 | 4,
  "comment-content": 1 | 2 | 4,
  "whitespace": 1 | 4,
  "selector-value": 8,
  "selector-regex-pattern": 8
};

export function parseRules(wfrText) {
  let rules = [];
  const tokens = tokenize(wfrText);
  processTokens(tokens, rules);
  console.log(213, rules)
  return rules.filter(
    (rule) => rule.selectors.some((s) => s.length > 0) && Object.keys(rule.features).length > 0
  );
}

export function tokenize(text) {
  const tokens = [];
  let pos = 0;
  const state = { inSelector: false, inBlock: false, inMultiLineComment: false, afterRegexPrefix: false, afterSelectorOperator: false, expectingAttribute: false };

  while (pos < text.length) {
    const slice = text.slice(pos);
    let matched = false;
    for (const { type, pattern } of tokenPatterns) {
      if (!shouldProcessToken(type, state)) continue;
      const match = slice.match(pattern);
      if (match) {
        const text = match[0];
        updateState(type, text, state);
        tokens.push({ type, text, state: { ...state } });
        pos += text.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      tokens.push({ type: "unknown", text: slice[0], state: { ...state } });
      pos++;
    }
  }
  return tokens;
}

function shouldProcessToken(type, state) {
  if (state.inMultiLineComment && !((tokenTypes[type] & 1) === 1)) return false;
  if (!state.inMultiLineComment && ((tokenTypes[type] & 2) === 2)) return false;
  if (type === "selector-value" && !state.afterSelectorOperator) return false;
  if (type === "selector-regex-prefix" && state.inBlock) return false;
  if (type === "feature-colon" && !state.inBlock) return false;
  if (type === "selector-attribute" && !state.expectingAttribute) return false;
  if (type === "selector-regex-pattern" && !state.afterRegexPrefix) return false;
  // Allow selector to end after regex prefix without a pattern
  if (state.afterRegexPrefix && type !== "selector-regex-pattern" && type !== "whitespace" && type !== "selector-bracket") return false;
  if (type !== "whitespace" && type !== "selector-attribute" && state.expectingAttribute) return false;
  return true;
}

function updateState(type, text, state) {
  if (type === "comment-start") state.inMultiLineComment = true;
  else if (type === "comment-end") state.inMultiLineComment = false;
  else if (type === "selector-bracket") {
    state.inSelector = text === "[";
    state.afterSelectorOperator = false;
    state.expectingAttribute = text === "[";
    if (text === "]") {
      state.expectingAttribute = false; // Reset when closing
      state.afterRegexPrefix = false;
    }
  } else if (type === "block-bracket") {
    state.inBlock = text === "{";
    if (text === "{") state.inSelector = false;
    state.afterRegexPrefix = false;
    state.expectingAttribute = false;
  } else if (type === "selector-operator") state.afterSelectorOperator = true;
  else if (type === "selector-regex-prefix") state.afterRegexPrefix = true;
  else if (type === "selector-value" || type === "selector-regex-pattern") {
    state.afterSelectorOperator = false;
    state.afterRegexPrefix = false;
  } else if (type === "selector-attribute") state.expectingAttribute = false;
}

function processTokens(tokens, rules) {
  let currentRule = null, currentSelector = null, currentFeature = null, inMultiLineComment = false, inBlock = false;
  for (const token of tokens) {
    if (isCommentToken(token.type)) {
      inMultiLineComment = token.type === "comment-start" ? true : token.type === "comment-end" ? false : inMultiLineComment;
      continue;
    }
    if (inMultiLineComment) continue;
    handleToken(token, { currentRule, currentSelector, currentFeature, inBlock }, (state) => {
      currentRule = state.currentRule;
      currentSelector = state.currentSelector;
      currentFeature = state.currentFeature;
      inBlock = state.inBlock;
    });
    if (currentRule && !rules.includes(currentRule)) rules.push(currentRule);
  }
}

function isCommentToken(type) {
  return ((tokenTypes[type] & 4) === 4);
}

function handleToken(token, state, updateState) {
  if (token.type === "selector-bracket" && token.text === "[") {
    if (!state.currentRule || state.inBlock) {
      const selectors = [[]], features = {};
      state.currentSelector = selectors[0];
      state.currentRule = { selectors, features };
    } else {
      state.currentRule.selectors.push(state.currentSelector = []);
    }
    state.currentSelector.push({ attribute: "", operator: "", value: "", isRegex: false });
  } else if (token.type === "selector-attribute" && state.currentSelector) {
    const condition = state.currentSelector[state.currentSelector.length - 1];
    condition.attribute = token.text;
    if (state.currentSelector.length > 0 && token.state.expectingAttribute && !token.state.afterSelectorOperator) {
      condition.operator = "exists";
      condition.value = null;
    }
  } else if (token.type === "selector-operator" && state.currentSelector) {
    state.currentSelector[state.currentSelector.length - 1].operator = token.text;
  } else if (token.type === "selector-regex-prefix" && state.currentSelector) {
    state.currentSelector[state.currentSelector.length - 1].isRegex = true;
    state.currentSelector[state.currentSelector.length - 1].value = ""; // Default empty until pattern
  } else if (((tokenTypes[token.type] & 8) === 8) && state.currentSelector) {
    const condition = state.currentSelector[state.currentSelector.length - 1];
    condition.value = token.text; // Exact text from token (e.g., "/")
    if (token.type === "selector-regex-pattern") condition.isRegex = true;
  } else if (token.type === "block-bracket") {
    state.inBlock = token.text === "{";
    if (token.text === "}") {
      state.currentRule = null;
      state.currentSelector = null;
    }
  } else if (token.type === "feature-name" && state.inBlock && state.currentRule) {
    state.currentFeature = token.text;
  } else if (token.type === "feature-value" && state.inBlock && state.currentRule && state.currentFeature) {
    state.currentRule.features[state.currentFeature] = token.text.replace(/^("|')|("|')$/g, "");
  }
  updateState(state);
}

export function getFeatureValues(rules, url) {
  const parsedUrl = new URL(url);
  const featureValues = {};
  rules.sort((a, b) => Math.max(...a.selectors.map((s) => s.length)) - Math.max(...b.selectors.map((s) => s.length))).forEach((rule) => {
    if (ruleMatchesUrl(rule, parsedUrl)) Object.assign(featureValues, rule.features);
  });
  return featureValues;
}

function ruleMatchesUrl(rule, parsedUrl) {
  return rule.selectors.some((selectorGroup) => selectorGroup.every((condition) => conditionMatchesUrl(condition, parsedUrl)));
}

function conditionMatchesUrl(condition, parsedUrl) {
  if (!condition.attribute || !parsedUrl) return false;
  if (condition.operator === "exists" && condition.attribute.startsWith("query.")) {
    return parsedUrl.searchParams.has(condition.attribute.substring(6));
  }
  const attrValue = getAttrValue(condition.attribute, parsedUrl);
  if (attrValue === null) return false;
  if (condition.attribute === "domain" && condition.value === "*" && !condition.isRegex) return true;
  return condition.isRegex ? matchRegex(attrValue, condition.value) :
    condition.attribute === "domain" && !/[?*]/.test(condition.value) ?
      attrValue === condition.value || attrValue.endsWith("." + condition.value) :
      matchGlob(attrValue, condition.value);
}

function getAttrValue(attribute, parsedUrl) {
  return attribute === "host" || attribute === "domain" ? parsedUrl.hostname || "" :
    attribute === "path" ? parsedUrl.pathname || "" :
      attribute.startsWith("query.") ? parsedUrl.searchParams.get(attribute.substring(6)) || null : null;
}

function matchRegex(attrValue, pattern) {
  if (!attrValue || !pattern) return false;
  try {
    const [, regexPattern, flags] = pattern.match(/^\/(.*)\/([a-z]*)$/) || [null, pattern, ""];
    if (!regexPattern) throw new Error("Incomplete regex pattern");
    return new RegExp(regexPattern, flags).test(attrValue);
  } catch (e) {
    console.warn("Invalid regex pattern:", pattern, e);
    return false;
  }
}

function matchGlob(attrValue, pattern) {
  if (!attrValue || !pattern) return false;
  try {
    const regexPattern = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
    return new RegExp("^" + regexPattern + "$").test(attrValue);
  } catch (e) {
    console.warn("Invalid glob pattern:", pattern, e);
    return false;
  }
}