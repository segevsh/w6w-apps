import type {
  ActionDefinition,
  HookContext,
  OutputField,
  Param,
  TriggerDefinition,
} from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

export interface SnapshotSpec {
  key: string;
  title: string;
  description: string;
  /** The EXISTING list action; its `execute` is called with `input(params)`. */
  action: ActionDefinition<never>;
  input(params: Record<string, unknown>): Record<string, unknown>;
  /** The records out of the action's result (requestAll returns an array; env-list an envelope). */
  items(result: unknown): unknown[];
  idOf(item: unknown): string;
  /** The part of a record whose change counts as an edit; omit for "new" only. */
  stampOf?(item: unknown): unknown;
  params?: Param[];
  output: OutputField[];
  sample: unknown;
}

/**
 * "New <record>" (or "new or updated") over a small bounded collection (brief §9.1 c): Vercel
 * documents `until`/`since` paging but the collection of a team's projects, domains or a project's
 * env vars is bounded by the account, so each check reads the whole list through the app's OWN list
 * action (`returnAll`) and diffs it against the previous check (`pollSnapshot`, ids only in state).
 * A record with no id fails the check loudly rather than being skipped.
 */
export function snapshotTrigger(spec: SnapshotSpec): TriggerDefinition {
  if (spec.action.type !== "read" && spec.action.type !== "search") {
    throw new Error(`trigger "${spec.key}": action "${spec.action.key}" is not read/search`);
  }
  const withUpdates = spec.stampOf !== undefined;
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ params, state }, ctx: HookContext) {
      const result = await (spec.action.execute as (i: unknown, c: HookContext) => unknown)(
        spec.input((params ?? {}) as Record<string, unknown>),
        ctx,
      );
      const byId = new Map<string, unknown>();
      for (const item of spec.items(result)) {
        const id = spec.idOf(item);
        if (!id) throw new Error(`Vercel list for "${spec.key}" returned a record without an id`);
        byId.set(id, item);
      }
      const { events, nextState } = await pollSnapshot({
        state,
        rows: [...byId].map(([key, item]) => ({
          key,
          values: withUpdates ? { stamp: spec.stampOf!(item) ?? null } : { key },
        })),
        emit: { added: true, updated: withUpdates },
      });
      return { events: events.map((e) => byId.get(e.key)), nextState };
    },
  };
}
