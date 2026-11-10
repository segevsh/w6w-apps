import type { ActionDefinition, HookContext, OutputField, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import { clock } from "./triggers.ts";
import { pollSinceWindow } from "./since-window.ts";

const OVERLAP_MS = 120_000;
const PAGE = 100;

interface Row {
  id?: unknown;
  createdOn?: unknown;
  modifiedOn?: unknown;
}

function parseTime(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : ms;
}

type Page = { data?: Row[]; hasMore?: boolean };

/**
 * A since-filter trigger over a ServiceTitan list action (brief 9.1 b). ServiceTitan documents no
 * list order, so none is relied on: a window is read page by page with a fixed `since`, the page
 * number is persisted until `hasMore` is false (9.8), the seed stores a floor (9.9), and the id dedupe
 * absorbs a row that moves between pages.
 *
 * - `new`: `filter` is the action's `createdOnOrAfter` (or, when the list has no created filter,
 *   `modifiedOnOrAfter` plus a client-side `createdOn` check), ids are the record id.
 * - `updated`: `modifiedOnOrAfter`, ids are `id:modifiedOn` so an edit is a new event.
 */
export function sinceTrigger(spec: {
  key: string;
  title: string;
  description: string;
  // deno-lint-ignore no-explicit-any
  action: ActionDefinition<any>;
  mode: "new" | "updated";
  filter: "createdOnOrAfter" | "modifiedOnOrAfter";
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition {
  const stampField = spec.mode === "new" ? "createdOn" : "modifiedOn";
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    poll({ state }, ctx: HookContext) {
      return pollSinceWindow<Row>({
        state,
        now: clock.now(),
        overlapMs: OVERLAP_MS,
        firstPos: 1,
        step: 1,
        maxPages: 2,
        maxEvents: 2 * PAGE,
        seenWindow: 500,
        idOf: (row) =>
          spec.mode === "updated"
            ? `${row.id ?? ""}:${row.modifiedOn ?? ""}`
            : String(row.id ?? ""),
        stampOf: (row) => parseTime(row[stampField]),
        async fetchPage(sinceMs, page) {
          const since = new Date(sinceMs).toISOString();
          const result = await spec.action.execute(
            { [spec.filter]: since, page, pageSize: PAGE },
            ctx,
          ) as Page;
          const items = result.data ?? [];
          return { items, more: result.hasMore ?? items.length >= PAGE };
        },
      });
    },
  };
}

/** Pages of the bounded snapshot lists: up to `SNAPSHOT_PAGES` pages of `SNAPSHOT_PAGE`. */
export const SNAPSHOT_PAGE = 200;
export const SNAPSHOT_PAGES = 10;

/**
 * A "New <record>" trigger over a small settings collection (brief 9.1 c): employees, technicians
 * and business units of one tenant. The whole list is read page by page through the action's own
 * `page`/`pageSize`; a tenant with more than `SNAPSHOT_PAGES * SNAPSHOT_PAGE` rows is refused with an
 * error rather than truncated.
 */
export function snapshotTrigger(spec: {
  key: string;
  title: string;
  description: string;
  // deno-lint-ignore no-explicit-any
  action: ActionDefinition<any>;
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ state }, ctx: HookContext) {
      const rows = new Map<string, Row>();
      for (let page = 1; page <= SNAPSHOT_PAGES; page++) {
        const res = await spec.action.execute({ page, pageSize: SNAPSHOT_PAGE }, ctx) as Page;
        for (const row of res.data ?? []) rows.set(String(row.id ?? ""), row);
        if (!(res.hasMore ?? (res.data ?? []).length >= SNAPSHOT_PAGE)) break;
        if (page === SNAPSHOT_PAGES) {
          throw new Error(
            `${spec.key}: more than ${
              SNAPSHOT_PAGES * SNAPSHOT_PAGE
            } rows; the trigger watches at most that many`,
          );
        }
      }
      const { events, nextState } = await pollSnapshot({
        state,
        emit: { added: true, updated: false },
        rows: [...rows].map(([key, values]) => ({ key, values })),
      });
      return { events: events.map((e) => e.values), nextState };
    },
  };
}
