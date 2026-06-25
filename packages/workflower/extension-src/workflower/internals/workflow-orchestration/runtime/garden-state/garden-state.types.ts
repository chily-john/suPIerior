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
