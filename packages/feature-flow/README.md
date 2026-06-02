TEMPORARILY RETIRED
TO BE REVIEWED AT A LATER DATE
# @supierior/feature-flow

Pi package that registers `/feature <description>`.

`/feature` uses Pi's active model, provider, auth, and thinking level. Configure/select a Pi model with Pi's normal `/login` and `/model` flows before running `/feature`.

V1 asks bounded discovery questions one at a time, writes `.pi/features/<slug>/feature.draft.md`, performs a blocker-only review fallback, writes canonical `feature.md` and `plan.md`, removes the draft, and stops. It does not create GitHub issues, update pi-rules, add menus/subcommands, or implement the planned feature.

Discovery model responses intentionally do not generate backlogs. Each discovery turn re-evaluates the full feature state and prior answers, then returns either `readyToGenerate: true` with `estimatedNumberOfQuestionsRemaining: 0` or exactly one next `question` with a required non-negative `estimatedNumberOfQuestionsRemaining` estimate.

During discovery, `/feature` currently asks model-generated discovery questions through Pi's normal chat/input prompt. The reusable `QuestionSession` lifecycle from `@supierior/tui-tools` is intentionally not used for now because the question tool needs more work before it is reliable enough for this workflow.

Fresh review note: Pi command APIs can create replacement sessions, but V1 keeps artifact finalization in-process so the command can reliably write files once. The draft is treated as the reviewer handoff boundary and blocker review only asks for missing information needed to produce aligned artifacts.
