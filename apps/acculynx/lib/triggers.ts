import type { ActionDefinition, HookContext, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/** AccuLynx documents a maximum page of 25 on its search and job lists; every snapshot uses it. */
export const PAGE_SIZE = 25;
/** 20 pages of 25 = 500 records; a longer collection is refused rather than silently truncated. */
export const MAX_PAGES = 20;

type Row = Record<string, unknown>;
type Paged = { items?: Row[]; count?: number };

/**
 * Every record of one existing list action, by repeated calls: `startIndex` is the zero-based record
 * index the action maps to the endpoint's own parameter. AccuLynx answers 416 when the start index
 * is at or past the end, so an empty collection (416 on the first call) is an empty list.
 */
export async function allRecords(
  action: ActionDefinition,
  input: Record<string, unknown>,
  ctx: HookContext,
): Promise<Row[]> {
  const out: Row[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    let res: Paged;
    try {
      res = await action.execute(
        { ...input, pageSize: PAGE_SIZE, startIndex: out.length },
        ctx,
      ) as Paged;
    } catch (err) {
      if (out.length === 0 && /^AccuLynx 416\b/.test(String((err as Error).message))) return out;
      throw err;
    }
    const items = res.items ?? [];
    out.push(...items);
    if (items.length === 0 || out.length >= (res.count ?? 0)) return out;
  }
  throw new Error(
    `more than ${MAX_PAGES * PAGE_SIZE} records: this trigger watches at most ${
      MAX_PAGES * PAGE_SIZE
    }`,
  );
}

/**
 * Bounded snapshot poll (brief 9.1 c) over an existing list action: the whole collection is read
 * each check and only records whose id was not in the previous check are emitted (`added` only).
 */
export function recordSnapshot(
  spec: Pick<TriggerDefinition, "key" | "title" | "description" | "output" | "sample"> & {
    action: ActionDefinition;
    params?: Param[];
    input: (params: Record<string, unknown>) => Record<string, unknown>;
    keyOf?: (item: Row) => string;
  },
): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params ?? [],
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ state, params }, ctx) {
      const items = await allRecords(
        spec.action,
        spec.input(params as Record<string, unknown>),
        ctx,
      );
      const { events, nextState } = await pollSnapshot({
        state,
        emit: { added: true, updated: false },
        rows: items.map((item) => ({
          key: (spec.keyOf ?? ((i) => String(i.id ?? "")))(item),
          values: item,
        })),
      });
      return { events: events.map((e) => e.values), nextState };
    },
  };
}

const DAY_MS = 86_400_000;
const isoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * The appointment window: today (UTC) through 89 days on. AccuLynx: "The request range should not
 * exceed 90 days".
 */
export function appointmentWindow(): { startDate: string; endDate: string } {
  const start = Date.parse(isoDate(Date.now()));
  return { startDate: isoDate(start), endDate: isoDate(start + 89 * DAY_MS) };
}
