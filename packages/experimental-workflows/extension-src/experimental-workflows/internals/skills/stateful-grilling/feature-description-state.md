# Stateful Grilling Feature State

Store the working feature understanding in Workflower garden state key:

```text
statefulGrilling.feature
```

The value is a JSON-compatible object. Keep it as durable working memory, not a transcript. Summarize decisions, requirements, and unresolved gaps; do not copy long chat logs.

## Shape

```json
{
  "version": 1,
  "iteration": 0,
  "title": "Short feature name or null",
  "summary": "Concise description of the feature",
  "problem": "Problem or opportunity the feature addresses",
  "targetUsers": ["Primary users or personas"],
  "userGoals": ["Goals users are trying to accomplish"],
  "scope": {
    "in": ["Included behavior"],
    "out": ["Explicitly excluded behavior"]
  },
  "functionalRequirements": ["Specific product behaviors"],
  "nonFunctionalRequirements": ["Performance, security, accessibility, reliability, etc."],
  "userFlows": ["Important end-to-end interactions"],
  "dataAndIntegrations": ["Data, APIs, persistence, dependencies, or external systems"],
  "edgeCases": ["Boundary cases, errors, empty states, permissions, concurrency, etc."],
  "acceptanceCriteria": ["Observable criteria that prove the feature is done"],
  "constraints": ["Technical, product, timeline, migration, compatibility, or policy constraints"],
  "risks": ["Known risks or assumptions to validate"],
  "openQuestions": ["Highest-value questions still blocking a complete understanding"],
  "understandingPercent": 0,
  "understandingRationale": "Why this percentage is justified",
  "updatedAt": "ISO-8601 timestamp"
}
```

## Validation Rules

- `version` must be `1`.
- `iteration` must be a non-negative integer and increments by 1 after each update step.
- `understandingPercent` must be an integer from 0 to 100.
- Treat `95` or higher as complete enough to produce the final feature description.
- Keep `openQuestions` focused on gaps that materially affect implementation; do not list nice-to-have curiosity questions.
- Empty arrays are allowed when no facts are known yet.
- If existing state is missing, initialize it from the current mini-conversation.
- If existing state is malformed, repair it conservatively when possible; otherwise stop and explain the malformed fields.
