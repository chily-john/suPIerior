---
kind: rules
paths:
  - "packages/pi-rules/extension-src/pi-rules/pi/tools/**/*"
summary: Model-callable tools registered by the pi-rules extension.
triggers:
  - hier rules status tool
  - register tool
  - model callable tool
---

# Tools

Enter here when adding or changing tools available to the model through the extension. Tool descriptions are behavior controls: they should clearly tell the model when not to call the tool as well as what it returns.

### Patterns & Conventions

- Status tooling should reuse the same index and report formatter as slash commands.
- Keep tool outputs structured enough for consumers while returning concise text for normal display.
- Do not encourage status checks before ordinary edits; rule injection should be trusted unless missing or ambiguous.
