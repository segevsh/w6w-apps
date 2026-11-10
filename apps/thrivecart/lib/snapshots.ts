import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import { modeParam } from "./params.ts";

export interface SnapshotSpec {
  key: string;
  title: string;
  description: string;
  /** A `{ items }` list action (product-list, bump-list, upsell-list, downsell-list). */
  action: ActionDefinition<{ mode?: string }>;
  /** The id field of one list item. */
  idField: string;
  label: string;
  sample: Record<string, unknown>;
}

/**
 * ThriveCart's product, bump, upsell and downsell lists are plain unpaginated arrays (the
 * Postman API documentation shows no page parameters), so each check compares the whole list.
 */
export function snapshotTrigger(spec: SnapshotSpec): TriggerDefinition<{ mode?: string }> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [modeParam],
    output: [
      { key: "change", type: "string", label: "Change" },
      { key: "key", type: "string", label: "Id" },
      { key: "values", type: "object", label: spec.label },
    ],
    sample: { change: "added", key: String(spec.sample[spec.idField]), values: spec.sample },
    minIntervalMs: 300_000,
    async poll({ state, params }, ctx) {
      const result = await spec.action.execute({ mode: params?.mode }, ctx) as {
        items?: Array<Record<string, unknown>>;
      };
      const rows = (result.items ?? []).map((item) => ({
        key: String(item[spec.idField] ?? ""),
        values: item,
      }));
      return await pollSnapshot({ state, rows, emit: { added: true, updated: false } });
    },
  };
}
