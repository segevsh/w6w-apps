import type { ActionDefinition, OutputField, TriggerDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";

/**
 * Gateway tokens Chargebee returns on customers and payment sources (`payment_method.reference_id`,
 * `reference_id`): a trigger never writes them into run history.
 */
const SECRET_KEYS = new Set(["reference_id"]);

function strip(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(strip);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).filter(([k]) => !SECRET_KEYS.has(k)).map(([k, v]) => [k, strip(v)]),
    );
  }
  return value;
}

/**
 * A Chargebee "new" / "new or updated" poll over one of the app's own list actions. Every Chargebee
 * list answers `{ list: [ { <wrapper>: {...} } ], next_offset }`; the poll asks for the newest page
 * (100 records, `sort_by[desc]=<sortAttribute>`) and unwraps each row. `stamp: "updated_at"` makes
 * an edit a new event (`<id>:<updated_at>`), which needs the list sorted by `updated_at`.
 */
export function chargebeeTrigger(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  wrapper: string;
  sortAttribute: "created_at" | "updated_at" | "date";
  stamp?: "updated_at";
  output: OutputField[];
  sample: Record<string, unknown>;
}): TriggerDefinition {
  return pollFromListAction({
    key: spec.key,
    title: spec.title,
    description: spec.description,
    action: spec.action,
    input: () => ({ limit: 100, sortAttribute: spec.sortAttribute, sortOrder: "desc" }),
    items: (result) => {
      const list = (result as { list?: Array<Record<string, unknown>> }).list ?? [];
      return list.flatMap((row) =>
        row[spec.wrapper] === undefined ? [] : [strip(row[spec.wrapper])]
      );
    },
    idOf: (item) => {
      const r = item as { id?: unknown; updated_at?: unknown };
      if (typeof r.id !== "string" || !r.id) {
        throw new Error(`Chargebee ${spec.wrapper} list returned a record without id`);
      }
      return spec.stamp ? `${r.id}:${r.updated_at ?? ""}` : r.id;
    },
    output: spec.output,
    sample: spec.sample,
  });
}
