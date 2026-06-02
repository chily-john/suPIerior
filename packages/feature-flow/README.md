# @supierior/feature-flow

Pi package that registers `/feature <description>`.

`/feature` uses Pi's active model, provider, auth, and thinking level. Configure/select a Pi model with Pi's normal `/login` and `/model` flows before running `/feature`.

V1 asks bounded discovery questions one at a time, writes `.pi/features/<slug>/feature.draft.md`, performs a blocker-only review fallback, writes canonical `feature.md` and `plan.md`, removes the draft, and stops. It does not create GitHub issues, update pi-rules, add menus/subcommands, or implement the planned feature.

Discovery model responses intentionally do not generate backlogs. Each discovery turn re-evaluates the full feature state and prior answers, then returns either `readyToGenerate: true` with `estimatedNumberOfQuestionsRemaining: 0` or exactly one next `question` with a required non-negative `estimatedNumberOfQuestionsRemaining` estimate.

During discovery, `/feature` uses the reusable `QuestionSession` lifecycle from `@supierior/tui-tools`: Pi's default working spinner is visible while the model is thinking, submitted question/answer context stays visible between generated questions, and terminal input is intentionally locked while discovery is loading. The next model-generated question replaces the loading/submitted-answer context cleanly when it is ready.

Fresh review note: Pi command APIs can create replacement sessions, but V1 keeps artifact finalization in-process so the command can reliably write files once. The draft is treated as the reviewer handoff boundary and blocker review only asks for missing information needed to produce aligned artifacts.
