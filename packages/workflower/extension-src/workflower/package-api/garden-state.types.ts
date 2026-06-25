export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export type GardenStateProducer = {
  workflowId: string;
  stepId?: string;
  stepIndex: number;
  gardenName: string;
  gardenPath: string;
  flowerName?: string;
  flowerPath: string;
};

export type GardenStateEntry = {
  value: JsonValue;
  updatedAt: string;
  producer?: GardenStateProducer;
};

export type GardenStateFile = {
  version: 1;
  values: Record<string, GardenStateEntry>;
};

export type GardenStateListItem = GardenStateEntry & {
  key: string;
};

export type GardenStateFailure = {
  ok: false;
  message: string;
};

export type GardenStateGetSuccess = {
  ok: true;
  key: string;
  found: boolean;
  entry?: GardenStateEntry;
};

export type GardenStateSetSuccess = {
  ok: true;
  key: string;
  entry: GardenStateEntry;
  message: string;
};

export type GardenStateListSuccess = {
  ok: true;
  values: Record<string, GardenStateEntry>;
  keys: string[];
};

export type GardenStateGetResult = GardenStateGetSuccess | GardenStateFailure;
export type GardenStateSetResult = GardenStateSetSuccess | GardenStateFailure;
export type GardenStateListResult = GardenStateListSuccess | GardenStateFailure;
