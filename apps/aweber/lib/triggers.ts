import type {
  ActionDefinition,
  HookContext,
  OutputField,
  Param,
  TriggerDefinition,
} from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/**
 * A "New <record>" poll trigger over a small, bounded AWeber collection (one account's lists, one
 * list's segments or tags): the whole collection is read in one request (`ws.size` is capped at
 * 100 by AWeber) and compared with the previous check; only additions are emitted.
 */
export function snapshotTrigger(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  params: Param[];
  input(params: Record<string, unknown>): Record<string, unknown>;
  rows(result: unknown): unknown[];
  keyOf(row: unknown): string;
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 900_000,
    async poll({ params, state }, ctx) {
      const result = await spec.action.execute(spec.input(params as Record<string, unknown>), ctx);
      return await pollSnapshot({
        state,
        maxRows: 5000,
        emit: { added: true },
        rows: spec.rows(result).map((row) => ({ key: spec.keyOf(row), values: row })),
      });
    },
  };
}

/** The `entries` array of an AWeber collection response. */
export const entries = (result: unknown): unknown[] =>
  (result as { entries?: unknown[] }).entries ?? [];

/** Broadcasts read per check: five pages of the documented `ws.size` maximum. */
export const BROADCAST_PAGES = 5;
export const BROADCAST_PAGE_SIZE = 100;

/**
 * Snapshot of one list's SENT broadcasts. AWeber sorts `status=sent` by `sent_at` but does not state
 * the direction, so the trigger relies on no order: it reads up to {@link BROADCAST_PAGES} pages
 * (`ws.start` / `ws.size`) and compares the ids with the previous check; only additions are emitted.
 */
export async function pollSentBroadcasts(
  state: unknown,
  params: Record<string, unknown>,
  ctx: HookContext,
  read: ActionDefinition,
) {
  const rows: unknown[] = [];
  for (let page = 0; page < BROADCAST_PAGES; page++) {
    const result = await read.execute({
      accountId: params.accountId,
      listId: params.listId,
      status: "sent",
      start: page * BROADCAST_PAGE_SIZE,
      size: BROADCAST_PAGE_SIZE,
    }, ctx) as { entries?: unknown[]; total_size?: number };
    const got = result.entries ?? [];
    rows.push(...got);
    if (got.length < BROADCAST_PAGE_SIZE || rows.length >= (result.total_size ?? Infinity)) break;
  }
  return await pollSnapshot({
    state,
    maxRows: 5000,
    emit: { added: true },
    rows: rows.map((row) => {
      const r = row as { broadcast_id?: unknown; id?: unknown };
      return { key: String(r.broadcast_id ?? r.id ?? ""), values: row };
    }),
  });
}
