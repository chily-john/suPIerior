import type { KanbanConverter } from "@domain/types";

export class KanbanConverterRegistry {
  private readonly converters = new Map<string, KanbanConverter>();

  register(converter: KanbanConverter): void {
    if (this.converters.has(converter.id)) {
      throw new Error(`Kanban converter '${converter.id}' is already registered.`);
    }
    this.converters.set(converter.id, converter);
  }

  resolve(id: string): KanbanConverter {
    const converter = this.converters.get(id);
    if (!converter) {
      const available = [...this.converters.keys()].sort().join(", ") || "none";
      throw new Error(`Unknown kanban converter '${id}'. Available converters: ${available}.`);
    }
    return converter;
  }
}
