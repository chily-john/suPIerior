---
kind: rules
paths:
  - 'extension-src/pi-rules/domain/rule-context/discovery/**/*'
summary: Indexing, parsing, and reporting for `.pi/rules/**/*.md` files.
triggers:
  - rule index
  - frontmatter parsing
  - rules status report
  - .pi/rules discovery
---

# Discovery

This module discovers markdown files under `.pi/rules`, parses frontmatter, builds the cacheable rule index, and formats status output. It is about metadata and discovery, not selecting which rules to inject.

### Patterns & Conventions

- Keep frontmatter parsing tolerant; malformed or missing fields should degrade into empty metadata rather than crash status or injection.
- Normalize returned rule paths to project-relative forward-slash paths for display and matching.
- Rebuild the cached index only when the file signature changes.
