# WebFeatureRules (WFR) Guideline

Welcome to **WebFeatureRules (WFR)**, a human-readable and editable syntax designed to apply or disable features on webpages based on their hostname, pathname, and query parameters. Inspired by tools like uBlock Origin, WFR blends simplicity for general users with glob-style patterns and power for advanced users with regular expressions. Whether you're tweaking settings for a single site or crafting complex rules, WFR makes it easy to create, update, and remove rules without needing deep technical expertise.

---

## Overview of WebFeatureRules

### Basic Structure

A WFR rule consists of a **selector** and a **block**:

```
selector {
  feature1: value1;
  feature2: value2;
  ...
}
```

- **Selector**: Targets URLs using conditions like `[attribute=value]`.
- **Block**: Specifies features (e.g., `featureX: on;`) to apply or disable for matching URLs. Feature names and values depend on the application implementing WFR.

Rules are parsed sequentially, and if a rule is malformed—such as missing a closing bracket—it is skipped entirely, with parsing resuming at the next valid rule.

---

## Defining Selectors

### Selector Syntax

Selectors use conditions in the form `[attribute=value]` to match URLs. Combine conditions for precise targeting:

- **AND Logic**: Multiple conditions in one selector must all match (e.g., `[domain=example.com][path=/blog/*]`).
- **OR Logic**: Comma-separated selectors mean any can match (e.g., `[domain=example.com], [domain=another.com]`).

### Supported Attributes

1. **`host`**: Matches the exact hostname (e.g., `www.example.com`).
2. **`domain`**: Matches a domain and its subdomains (e.g., `example.com`, `www.example.com`).
3. **`path`**: Matches the pathname (e.g., `/blog/post`).
4. **`query.param`**: Matches a query parameter (e.g., `mode` in `?mode=debug`).

Malformed selectors (e.g., `[host=www.example.com` without `]`) cause the entire rule to be skipped, ensuring subsequent valid rules still apply.

---

## Specifying Values

### Value Types

Values define what to match for each attribute. WFR supports two patterns:

1. **Simple Patterns** (for general users):
   - Exact strings or glob-style wildcards (`?` for one character, `*` for a single segment, `**` for multiple segments).
   - Segments are separated by slashes (`/`) or dots (`.`), making `*` and `**` distinct in scope.
   - Intuitive and easy to use.

2. **Regular Expressions** (for advanced users):
   - Prefixed with `regex:`, `re:`, `:`, or `$`, followed by the pattern enclosed in `/` (e.g., `[attribute=regex:/pattern/]`).
   - Supports the `i` flag for case-insensitive matching (e.g., `[attribute=regex:/pattern/i]`).
   - Invalid regex (e.g., `[path=:/unclosed[`) causes the rule to be skipped.

---

## Attribute Usage Details

### 1. `host` Attribute

- **Purpose**: Targets the exact hostname of a URL.
- **Simple Pattern Usage**:
  - Exact Match: `[host=www.example.com]` matches only `www.example.com`.
  - Glob Wildcards:
    - `?`: Matches one character (e.g., `[host=sub?.example.com]` matches `sub1.example.com`, but not `sub12.example.com`).
    - `*`: Matches any characters within a single segment (between `.` or `/`) (e.g., `[host=*.example.com]` matches `www.example.com`, but not `sub.sub.example.com`).
    - `**`: Matches any characters across multiple segments (e.g., `[host=**.example.com]` matches `example.com`, `sub.example.com`, `sub.sub.example.com`).
    - Mixed Usage: Combines `?`, `*`, `**` (e.g., `[host=*sub?.example.com]` matches `prefixsub1.example.com`).
  - Note: Glob patterns are case-sensitive by default.
- **Regular Expression Usage**:
  - Syntax: `[host=regex:/pattern/]`, `[host=re:/pattern/]`, `[host=:/pattern/]`, or `[host=$/pattern/]`.
  - Optional `i` flag: `[host=regex:/pattern/i]`.

#### Examples for `host`
- **Simple Pattern**:
  ```
  [host=www.example.com] {
    featureX: on;
  }
  ```
  - Matches: `http://www.example.com`, `https://www.example.com/path`.
  - Does not match: `http://example.com`.

- **Glob Pattern with `*`**:
  ```
  [host=*.example.com] {
    featureY: off;
  }
  ```
  - Matches: `http://sub.example.com`, `https://www.example.com`.
  - Does not match: `http://example.com`, `http://sub.sub.example.com`.

- **Glob Pattern with `**`**:
  ```
  [host=**.example.com] {
    featureZ: on;
  }
  ```
  - Matches: `http://example.com`, `http://sub.example.com`, `http://sub.sub.example.com`.
  - Does not match: `http://another.com`.

- **Glob Pattern with `?`**:
  ```
  [host=sub?.example.com] {
    featureW: on;
  }
  ```
  - Matches: `http://sub1.example.com`, `https://suba.example.com`.
  - Does not match: `http://sub12.example.com`, `http://example.com`.

- **Mixed Glob Pattern**:
  ```
  [host=*sub?.example.com] {
    featureV: on;
  }
  ```
  - Matches: `http://prefixsub1.example.com`, `https://xsuba.example.com`.
  - Does not match: `http://sub.example.com`, `http://sub12.example.com`.

- **Regular Expression**:
  ```
  [host=regex:/^sub\d+\.example\.com$/] {
    featureZ: on;
  }
  ```
  - Matches: `http://sub1.example.com`, `https://sub123.example.com`.
  - Does not match: `http://sub.example.com`.

---

### 2. `domain` Attribute

- **Purpose**: Targets a domain and its subdomains.
- **Simple Pattern Usage**:
  - Exact Match: `[domain=example.com]` matches `example.com`, `www.example.com`, `sub.example.com`.
- **Regular Expression Usage**:
  - Syntax: `[domain=regex:/pattern/]`, `[domain=re:/pattern/]`, `[domain=:/pattern/]`, or `[domain=$/pattern/]`.
  - Optional `i` flag: `[domain=regex:/pattern/i]`.

#### Examples for `domain`
- **Simple Pattern**:
  ```
  [domain=example.com] {
    featureA: on;
  }
  ```
  - Matches: `http://example.com`, `https://www.example.com/path`, `http://sub.example.com`.
  - Does not match: `http://another.com`.

- **Glob Pattern**:
  ```
  [domain=example?.com] {
    featureB: on;
  }
  ```
  - Matches: `http://example1.com`, `https://example2.com`, `https://exampleK.com`.
  - Does not match: `http://another.com`, `https://example.com`.

- **Regular Expression**:
  ```
  [domain=$/^example\.(com|net)$/] {
    featureB: off;
  }
  ```
  - Matches: `http://example.com`, `https://sub.example.com`, `http://example.net`.
  - Does not match: `http://sub.another.com`.

---

### 3. `path` Attribute

- **Purpose**: Targets the pathname (after the hostname).
- **Simple Pattern Usage**:
  - Exact Match: `[path=/blog/post]` matches `/blog/post` exactly.
  - Glob Wildcards:
    - `?`: Matches one character (e.g., `[path=/page?]` matches `/page1`, `/pageA`).
    - `*`: Matches any characters within a single segment (between `/` or `.`) (e.g., `[path=/blog/*]` matches `/blog/post`, but not `/blog/sub/post`).
    - `**`: Matches any characters across multiple segments (e.g., `[path=/blog/**]` matches `/blog/post`, `/blog/sub/post`).
    - Mixed Usage: Combines `?`, `*`, `**` (e.g., `[path=/blog/*?]` matches `/blog/post1`, `/blog/abc1`).
  - Note: `*` and `**` differ based on segment boundaries (`/` or `.`).
- **Regular Expression Usage**:
  - Syntax: `[path=regex:/pattern/]`, `[path=re:/pattern/]`, `[path=:/pattern/]`, or `[path=$/pattern/]`.
  - Optional `i` flag: `[path=regex:/pattern/i]`.

#### Examples for `path`
- **Simple Pattern with AND Logic**:
  ```
  [domain=example.com][path=/blog/*] {
    featureC: off;
  }
  ```
  - Matches: `http://example.com/blog/post`, `https://www.example.com/blog/another`.
  - Does not match: `http://example.com/blog/sub/post`, `http://example.com/about`.

- **Glob with `**`**:
  ```
  [path=/blog/**] {
    featureD: on;
  }
  ```
  - Matches: `http://example.com/blog/post`, `http://site.com/blog/sub/post`, `http://site.com/blog/any/depth`.
  - Does not match: `http://example.com/about`.

- **Glob with `?`**:
  ```
  [path=/page?] {
    featureE: on;
  }
  ```
  - Matches: `http://example.com/page1`, `https://site.com/pageA`.
  - Does not match: `http://example.com/page12`.

- **Mixed Glob Patterns**:
  ```
  [path=/blog/*?] {
    featureF: on;
  }
  ```
  - Matches: `http://example.com/blog/post1`, `https://site.com/blog/x1`.
  - Does not match: `http://example.com/blog/post12`, `http://example.com/blog/sub/x`.

  ```
  [path=/blog/**?] {
    featureG: off;
  }
  ```
  - Matches: `http://example.com/blog/sub/x1`, `http://site.com/blog/deep/path/a`.
  - Does not match: `http://example.com/blog/sub/xy`, `http://example.com/about`.

  ```
  [path=/*?/**] {
    featureH: on;
  }
  ```
  - Matches: `http://example.com/x1/sub/path`, `https://site.com/ab2/any/depth`.
  - Does not match: `http://example.com/abc/sub`, `http://example.com`.

- **Flexible Glob Patterns**:
  ```
  [path=/**] {
    featureI: on;
  }
  ```
  - Matches: `http://example.com/`, `https://site.com/anything/here`.

  ```
  [path=/blog*] {
    featureJ: off;
  }
  ```
  - Matches: `http://example.com/blog123`, `http://example.com/blogpost`.
  - Does not match: `http://example.com/blog/post`.

  ```
  [path=**post] {
    featureK: on;
  }
  ```
  - Matches: `http://example.com/post`, `http://example.com/any/sub/post`.

- **Regular Expression**:
  ```
  [path=regex:/^\/articles\/\d+$/] {
    featureL: on;
  }
  ```
  - Matches: `http://example.com/articles/123`, `https://site.com/articles/456`.

---

### 4. `query.param` Attribute

- **Purpose**: Targets query parameters in the URL.
- **Simple Pattern Usage**:
  - Presence Check: `[query.param]` matches if `param` exists (e.g., `[query.mode]` matches `?mode=debug`, `?mode=test`).
  - Exact Match: `[query.param=value]` matches if `param` equals `value` (e.g., `[query.mode=debug]`).
  - Glob Wildcards:
    - `?`: Matches a single character (e.g., `[query.id=?]` matches `id=1`, but not `id=ab`).
    - `*`: Matches any value within a single segment (e.g., `[query.id=*]` matches `id=123`, but not `id=abc.def`).
    - `**`: Matches any value across multiple segments (e.g., `[query.id=**]` matches `id=123`, `id=abc.def`).
    - Mixed Usage: Combines `?`, `*`, `**` (e.g., `[query.id=*?]` matches `id=abc1`).
- **Regular Expression Usage**:
  - Syntax: `[query.param=regex:/pattern/]`, `[query.param=re:/pattern/]`, `[query.param=:/pattern/]`, or `[query.param=$/pattern/]`.
  - Optional `i` flag: `[query.param=regex:/pattern/i]`.

#### Examples for `query.param`
- **Presence Check**:
  ```
  [query.mode] {
    featureF: on;
  }
  ```
  - Matches: `http://example.com?page=1&mode=debug`, `https://site.com?mode=test`.
  - Does not match: `http://example.com?page=1`.

- **Glob with `*`**:
  ```
  [query.id=*] {
    featureG: on;
  }
  ```
  - Matches: `http://example.com?id=123`, `https://site.com?id=abc`.
  - Does not match: `http://example.com?id=abc.def`.

- **Glob with `**`**:
  ```
  [query.id=**] {
    featureH: on;
  }
  ```
  - Matches: `http://example.com?id=123`, `https://site.com?id=abc.def`.

- **Glob with `?`**:
  ```
  [query.id=?] {
    featureI: on;
  }
  ```
  - Matches: `http://example.com?id=1`, `https://site.com?id=a`.
  - Does not match: `http://example.com?id=ab`.

- **Mixed Glob Pattern**:
  ```
  [query.id=*?] {
    featureJ: on;
  }
  ```
  - Matches: `http://example.com?id=abc1`, `https://site.com?id=x2`.
  - Does not match: `http://example.com?id=ab`, `http://example.com?id=abc.de`.

- **Regular Expression**:
  ```
  [query.id=regex:/\d+/] {
    featureK: on;
  }
  ```
  - Matches: `http://example.com?id=123`, `https://site.com?page=1&id=456`.

---

## Configuring Features

### Feature Blocks

Inside the `{}` block, list features and their values:
- Common values: `on` or `off`.
- Example:
  ```
  [domain=example.com] {
    featureX: on;
    featureY: off;
  }
  ```
- Note: Specific feature names and values depend on the application using WFR. Malformed selectors or invalid regex values cause the rule’s features to be ignored.

---

## Applying Rules

### Order of Precedence

Rules are applied sequentially from top to bottom in the order they appear. Each rule has equal weighting, regardless of how many conditions it contains. When multiple rules match a URL:

- The rules are scanned from the beginning to the end of the configuration.
- Features specified by later rules override earlier rules if there is any conflict.
- Malformed rules (e.g., missing brackets or invalid regex patterns) are skipped gracefully, ensuring that only valid rules affect the final outcome.

#### Examples for Rule Application

- **Complex Sequential Override with Glob**:
  ```
  [host=**.example.com] {
    featureX: on;
  }
  [host=test.example.com] {
    featureX: off;
  }
  ```
  - For `https://test.example.com/`, result is `featureX: off` (exact match overrides glob).

- **AND and OR with Mixed Glob Patterns**:
  ```
  [host=test?.example.com][path=/blog*?] {
    featureY: on;
  }
  [host=**sub.example.com], [path=**post] {
    featureY: off;
  }
  ```
  - For `https://test1.example.com/blogx1`, result is `featureY: on` (first rule matches, second doesn’t override due to non-matching OR conditions).

- **Combined Mixed Glob Across Attributes**:
  ```
  [host=**example.com][path=/test*?][query.mode=?] {
    featureZ: on;
  }
  ```
  - For `https://sub.example.com/testab1?mode=x`, result is `featureZ: on`.

---

## Best Practices

### Tips for Effective Use

- **Comments**: Add comments to explain your rules.
  - Single-line: `// This is a single-line comment`.
  - Multi-line:
    ```
    /*
        This is a multi-line comment.
        It can span multiple lines.
    */
    ```
- Start with simple patterns; use regex with `regex:`, `re:`, `:`, or `$` only when needed. Ensure regex patterns are valid to avoid rule skipping.
- Test rules carefully: malformed rules (e.g., `[domain=site.com` or `[path=:/broken[`) are skipped, allowing subsequent valid rules to apply in sequence.
- Use `?` for single characters, `*` for single segments, and `**` for multiple segments, combining them for nuanced matching (e.g., `/*?/**` for paths with specific constraints).

#### Example with Comments
```
/*
  Rules for site.com pages with mixed glob patterns
*/
[host=**site.com] {
  featureA: on;  // Enable featureA for all site.com subdomains and depths
}
[path=/page*?] {
  featureB: off;  // Disable featureB on single-segment pages ending with one character
}
```

---

## Summary

### Complete Usage Recap

**WebFeatureRules (WFR)** empowers you to:
- Target exact hostnames (`[host=www.example.com]`) or subdomains with glob (`[host=*.example.com]` for one segment, `[host=**.example.com]` for multiple segments, `[host=*sub?.example.com]` for mixed precision).
- Apply rules to domains and subdomains (`[domain=example.com]`) with flexibility (`[domain=re:/^(\w+\.)?example\.com$/i]`).
- Match paths exactly (`[path=/blog/post]`), with wildcards (`[path=/blog/*]` for one segment, `[path=/blog/**]` for multiple segments, `[path=/blog/*?]` for mixed patterns).
- Control based on query parameters (`[query.mode]`, `[query.mode=debug]`, `[query.id=?]`, `[query.id=*]`, `[query.id=**]`, `[query.id=*?]`, `[query.id=$/\d+/i]`).
- Annotate rules using single-line (`//`) and multi-line (`/* ... */`) comments.
- Handle errors robustly: malformed rules (e.g., missing `]` or invalid regex) are skipped, ensuring valid rules apply in order, with later rules overriding earlier ones for equal specificity.
