# Counter State Contract

The counter workflows share Workflower garden state under key `counter`.

## Shape

The value must be a JSON-compatible object:

```json
{
  "current": 0,
  "end": 5
}
```

Fields:

- `current`: finite integer representing the current counter value.
- `end`: finite integer representing the value at which the loop should stop.

## Validation

Every skill that reads or writes the key must validate that:

- the key exists before loop steps use it;
- the value is an object;
- `current` is a finite integer;
- `end` is a finite integer.

If validation fails, stop with a clear error instead of guessing or creating output files.

## Storage rules

- Use `workflower_state_get` to read key `"counter"`.
- Use `workflower_state_set` to write key `"counter"`.
- Do not use output files, pollen, or `counter-state.json` for this workflow.
