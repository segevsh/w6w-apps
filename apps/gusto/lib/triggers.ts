import type { ActionDefinition, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import { COMPANY_PARAM } from "./params.ts";

/** `yyyy-mm-dd` (UTC) for `now + days`. */
export function isoDay(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

/** A whole-number day count from a trigger param, falling back to `dflt`. */
export function dayCount(value: unknown, dflt: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 && n <= 3650 ? Math.floor(n) : dflt;
}

export const LOOKBACK_PARAM = (dflt: number): Param => ({
  key: "lookbackDays",
  label: "Look-back days",
  type: "number",
  default: dflt,
  advanced: true,
  hint: "How far back the watched window starts. The window is re-read on every check.",
});

export { COMPANY_PARAM };

/**
 * A poll trigger that re-reads a whole Gusto collection through its existing list action
 * (same client, endpoint and auth) and diffs it with `pollSnapshot`.
 *
 * Gusto's list endpoints document no created/updated cursor and no newest-first order, so the
 * collection is diffed instead. `added` is a new record; `updated` is any change to the record
 * (`new-or-updated-…` triggers). A removed record never fires. The first check only records
 * hashes, so existing records are never emitted. More than 5000 rows fails loudly (kit cap).
 */
export function snapshotTrigger(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  params?: Param[];
  input(params: Record<string, unknown>): Record<string, unknown>;
  items(result: unknown): unknown[];
  idOf(item: unknown): string;
  updated?: boolean;
  output: TriggerDefinition["output"];
  sample: unknown;
}): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params ?? [COMPANY_PARAM],
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ params, state }, ctx) {
      const p = (params ?? {}) as Record<string, unknown>;
      const result = await spec.action.execute(spec.input(p), ctx);
      const rows = new Map<string, unknown>();
      for (const item of spec.items(result)) {
        const key = spec.idOf(item);
        if (key && !rows.has(key)) rows.set(key, item);
      }
      const { events, nextState } = await pollSnapshot({
        state,
        rows: [...rows].map(([key, values]) => ({ key, values })),
        emit: { added: true, updated: spec.updated === true, removed: false },
      });
      return { events: events.map((e) => e.values), nextState };
    },
  };
}

export const asArray = (result: unknown): unknown[] => Array.isArray(result) ? result : [];

export const uuidOf = (item: unknown): string => String((item as { uuid?: unknown })?.uuid ?? "");

/** A required id param; throws a clear error instead of requesting `/…//…`. */
export function requireId(value: unknown, name: string): string {
  const id = String(value ?? "").trim();
  if (!id) throw new Error(`\`${name}\` is required`);
  return id;
}
