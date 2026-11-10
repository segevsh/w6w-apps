import type {
  ActionDefinition,
  HookContext,
  OutputField,
  Param,
  TriggerDefinition,
} from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/** Pages read per check; with the kit's 5000-row cap this bounds one check's requests. */
export const MAX_PAGES = 200;

export interface SnapshotSpec {
  key: string;
  title: string;
  description: string;
  /** The EXISTING list action; its `execute` is called with `input(now)` plus the `page` header. */
  action: ActionDefinition<never>;
  /** Fixed filters for the request; `now` (ms) lets a windowed list compute its date bound. */
  input(now: number): Record<string, unknown>;
  idOf?(item: unknown): string;
  params?: Param[];
  output: OutputField[];
  sample: unknown;
  minIntervalMs?: number;
}

/**
 * "New <record>" over a list Axonaut serves unordered and unfiltered, one page at a time through the
 * `page` header with no total (https://axonaut.com/api/v2/doc, 2026-11-10): each check reads every
 * page through the app's OWN list action until the first empty one and diffs the ids against the
 * previous check (`pollSnapshot`, added only; ids in state, never record values). More than the
 * kit's 5000 rows, or a vendor that keeps answering pages past MAX_PAGES, fails the check loudly.
 */
export function snapshotTrigger(spec: SnapshotSpec): TriggerDefinition {
  if (spec.action.type !== "read" && spec.action.type !== "search") {
    throw new Error(`trigger "${spec.key}": action "${spec.action.key}" is not read/search`);
  }
  const idOf = spec.idOf ?? ((i: unknown) => String((i as { id?: unknown }).id ?? ""));
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    type: "poll",
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: spec.minIntervalMs ?? 900_000,
    async poll({ state, params }, ctx: HookContext) {
      const input = {
        ...(params as Record<string, unknown> | undefined),
        ...spec.input(Date.now()),
      };
      const execute = spec.action.execute as (i: unknown, c: HookContext) => Promise<
        { items?: unknown[]; nextPage?: number | null }
      >;
      const byId = new Map<string, unknown>();
      let page = 1;
      for (let n = 0;; n++) {
        if (n === MAX_PAGES) {
          throw new Error(
            `Axonaut list for "${spec.key}" is longer than ${MAX_PAGES} pages; refusing to snapshot it`,
          );
        }
        const res = await execute({ ...input, page }, ctx);
        const items = Array.isArray(res?.items) ? res.items : [];
        for (const item of items) {
          const id = idOf(item);
          if (!id) {
            throw new Error(`Axonaut list for "${spec.key}" returned a record without an id`);
          }
          byId.set(id, item);
        }
        if (items.length === 0 || typeof res?.nextPage !== "number") break;
        page = res.nextPage;
      }
      const { events, nextState } = await pollSnapshot({
        state,
        rows: [...byId.keys()].map((key) => ({ key, values: { key } })),
        emit: { added: true, updated: false },
      });
      return { events: events.map((e) => byId.get(e.key)), nextState };
    },
  };
}
