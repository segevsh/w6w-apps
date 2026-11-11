import type { ActionDefinition, HookContext, OutputField, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import { pollWindow, toMs } from "./window.ts";

/**
 * Shared shapes of the Aidbase poll triggers beyond `new-ticket`.
 *
 * - {@link windowTrigger}: chats and emails take the documented `created_after` filter and a
 *   `next_cursor` page token (https://docs.aidbase.ai/apis/chatbot-api/reference and
 *   .../email-inbox-api/reference, verified 2026-11-10), so they poll a since-window with a
 *   resumable cursor (`pollWindow`, brief 9.8 / 9.9). No `limit` is sent: the docs do not list one,
 *   the page token is the documented paging control.
 * - {@link snapshotTrigger}: the account/parent collections (chatbots, inboxes, forms, knowledge and
 *   what is attached to one) carry no order or date filter, so each check reads the whole list
 *   (following `next_cursor` to the end) and `pollSnapshot` reports ids it has not seen.
 */

export const OVERLAP_MS = 120_000;
export const MAX_PAGES = 10;
export const clock = { now: (): number => Date.now() };

type Page = { items?: unknown[]; nextCursor?: unknown };

export function windowTrigger(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  params: TriggerDefinition["params"];
  output: OutputField[];
  sample: Record<string, unknown>;
}): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ params, state }, ctx) {
      const result = await pollWindow<unknown, string>({
        state,
        now: clock.now(),
        overlapMs: OVERLAP_MS,
        maxPages: MAX_PAGES,
        pageSize: 100,
        seenWindow: 1500,
        idOf: (item) => String((item as { id?: unknown }).id ?? ""),
        tsOf: (item) => toMs((item as Record<string, unknown>).created_at),
        async load(since, nextCursor) {
          const res = await spec.action.execute({
            ...params,
            createdAfter: new Date(since).toISOString(),
            nextCursor,
          } as never, ctx) as Page;
          return {
            items: res.items ?? [],
            next: typeof res.nextCursor === "string" && res.nextCursor !== ""
              ? res.nextCursor
              : undefined,
          };
        },
      });
      return { events: result.events, nextState: result.nextState };
    },
  };
}

const MAX_ROWS = 5000;
const MAX_LIST_PAGES = 200;

export const snapshotOutput: OutputField[] = [
  { key: "change", type: "string", label: "Change (added)" },
  { key: "key", type: "string", label: "Record ID" },
  { key: "values", type: "object", label: "The record" },
];

/** Every record of a list action, following `nextCursor` until the vendor stops sending one. */
export async function readAll(
  action: ActionDefinition,
  params: Record<string, unknown>,
  ctx: HookContext,
): Promise<unknown[]> {
  const rows: unknown[] = [];
  let nextCursor: string | undefined;
  for (let page = 0; page < MAX_LIST_PAGES; page++) {
    const res = await action.execute({ ...params, nextCursor } as never, ctx) as Page;
    rows.push(...(res.items ?? []));
    if (typeof res.nextCursor !== "string" || res.nextCursor === "") break;
    nextCursor = res.nextCursor;
  }
  return rows;
}

export function snapshotTrigger(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  params?: TriggerDefinition["params"];
  /** The record field that identifies it (`id` unless the vendor's rows carry another). */
  idField?: string;
  sample: Record<string, unknown>;
}): TriggerDefinition {
  const idField = spec.idField ?? "id";
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params ?? [],
    output: snapshotOutput,
    sample: { change: "added", key: String(spec.sample[idField]), values: spec.sample },
    minIntervalMs: 300_000,
    async poll({ params, state }, ctx) {
      const rows = await readAll(spec.action, params as Record<string, unknown>, ctx);
      return await pollSnapshot({
        state,
        maxRows: MAX_ROWS,
        emit: { added: true, updated: false },
        rows: rows.map((r) => ({
          key: String((r as Record<string, unknown>)[idField] ?? ""),
          values: r,
        })),
      });
    },
  };
}

/** The wrapped action's own param definitions for the given keys (parent ids, filters). */
export function pickParams(action: ActionDefinition, keys: string[]): NonNullable<
  TriggerDefinition["params"]
> {
  return (action.params ?? []).filter((p) => keys.includes(p.key));
}
