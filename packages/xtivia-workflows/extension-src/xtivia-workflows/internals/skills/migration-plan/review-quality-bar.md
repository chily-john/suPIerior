# Migration Plan Review Quality Bar

Score migration plans on a 1-5 integer scale. Scores of 4 or 5 pass; scores below 4 require concrete `requiredImprovements` in `wpMigrationPlanReview`.

A passing migration plan demonstrates:

- **Playwright capture usage**: the plan uses `page-capture.md`, screenshots, HTML, DOM summary, and image inventory rather than relying on memory or assumptions.
- **desktop/mobile coverage**: desktop and mobile captures are both reflected in section decisions, layout risks, and validation plans.
- **`.pi/rules` first**: the agent reads injected `.pi/rules` and target-project guidance before broad source searches.
- **verified source inspection**: claims about target architecture, components, styling, routes, and test tooling are backed by inspected files or clearly marked blockers.
- **concrete component decisions**: every significant page section has a component reuse/build classification and justification.
- **local content strategy**: static/local content is preferred for this POC unless the user explicitly requests CMS or WordPress data integration.
- **POC-appropriate Playwright verification**: validation plans use practical Playwright screenshots/checks for visual parity without requiring a brittle pixel-perfect system by default.

## Scoring guide

- **5**: complete, capture-grounded, architecture-aware, with clear component decisions and practical validation.
- **4**: acceptable; minor gaps are non-blocking.
- **3**: useful but missing material evidence, component decisions, or validation detail.
- **2**: does not adequately use captures or target architecture.
- **1**: unsafe, incoherent, or not actionable.
