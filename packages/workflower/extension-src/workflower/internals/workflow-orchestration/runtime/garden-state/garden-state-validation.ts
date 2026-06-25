import type { JsonValue } from "./garden-state.types";

const GARDEN_STATE_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/;
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export function validateGardenStateKey(key: string): void {
  if (!GARDEN_STATE_KEY_PATTERN.test(key) || FORBIDDEN_KEYS.has(key)) {
    throw new Error(
      `Invalid garden state key: ${JSON.stringify(key)}. Keys must match ${GARDEN_STATE_KEY_PATTERN.source} and must not be __proto__, constructor, or prototype.`,
    );
  }
}

export function assertJsonValue(value: unknown): asserts value is JsonValue {
  const failure = findJsonValueFailure(value, "$", new Set<object>());
  if (failure) throw new Error(`Invalid garden state value: ${failure}`);
}

export function cloneJsonValue(value: JsonValue): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

function findJsonValueFailure(value: unknown, path: string, seen: Set<object>): string | undefined {
  if (value === null) return undefined;

  switch (typeof value) {
    case "boolean":
    case "string":
      return undefined;
    case "number":
      return Number.isFinite(value) ? undefined : `${path} must be a finite number`;
    case "undefined":
      return `${path} must not be undefined`;
    case "function":
      return `${path} must not be a function`;
    case "symbol":
      return `${path} must not be a symbol`;
    case "bigint":
      return `${path} must not be a bigint`;
    case "object":
      return findObjectJsonValueFailure(value as object, path, seen);
    default:
      return `${path} is not JSON-compatible`;
  }
}

function findObjectJsonValueFailure(
  value: object,
  path: string,
  seen: Set<object>,
): string | undefined {
  if (seen.has(value)) return `${path} must not contain circular references`;
  seen.add(value);

  try {
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        if (!(index in value)) return `${path}[${index}] must not be a sparse array hole`;
        const failure = findJsonValueFailure(value[index], `${path}[${index}]`, seen);
        if (failure) return failure;
      }
      return undefined;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return `${path} must be a plain JSON object`;
    }

    for (const [key, child] of Object.entries(value)) {
      const failure = findJsonValueFailure(child, `${path}.${key}`, seen);
      if (failure) return failure;
    }
    return undefined;
  } finally {
    seen.delete(value);
  }
}
