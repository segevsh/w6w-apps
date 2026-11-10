import type { ActionDefinition, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

const PAGE = 100;
/** 50 pages of 100 = the kit's 5000-row snapshot ceiling. */
const MAX_PAGES = 50;

interface ListResult {
  items?: Array<{ id?: string | number }>;
  total?: number;
}

/**
 * A "New <record>" trigger over a Klipfolio `limit`/`offset` list (`GET /tabs`, `GET /datasources`):
 * the whole account-level collection is read through the action's own paging and a new id is a new record.
 */
export function newRecordTrigger(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<Record<string, unknown>>;
  idLabel: string;
  sample: unknown;
  /** Required parent id params (a group, a klip) passed to the action; none for account lists. */
  params?: Param[];
  /** False for a per-parent list the vendor returns whole, without `limit`/`offset`. */
  paged?: boolean;
}): TriggerDefinition {
  const paged = spec.paged !== false;
  const output: OutputField[] = [
    { key: "change", type: "string", label: "Change" },
    { key: "key", type: "string", label: spec.idLabel },
    { key: "values", type: "object", label: spec.title.replace(/^New /, "") },
  ];
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    ...(spec.params ? { params: spec.params } : {}),
    output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ params, state }, ctx) {
      const rows: Array<{ key: string; values: unknown }> = [];
      let offset = 0;
      for (let page = 0; page < MAX_PAGES; page++) {
        const res = await spec.action.execute(
          paged ? { ...(params ?? {}), limit: PAGE, offset } : { ...(params ?? {}) },
          ctx,
        ) as ListResult;
        const items = res.items ?? [];
        for (const item of items) {
          if (item.id !== undefined) rows.push({ key: String(item.id), values: item });
        }
        offset += items.length;
        if (!paged || items.length === 0 || typeof res.total !== "number" || offset >= res.total) {
          break;
        }
      }
      return await pollSnapshot({
        state,
        rows,
        emit: { added: true, updated: false },
        maxRows: 5000,
      });
    },
  };
}
