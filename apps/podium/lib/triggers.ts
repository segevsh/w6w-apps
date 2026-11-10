import type { ActionDefinition, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollFromListAction, pollSnapshot } from "../../_shared/poll/mod.ts";
import { pollWindow, toMs } from "./window.ts";

type Item = Record<string, unknown>;

export const OVERLAP_MS = 120_000;
export const PAGE_SIZE = 100;
/** Pages one since-filter check reads before it persists a resume cursor (brief 9.8). */
export const MAX_PAGES = 5;
const SEEN_WINDOW = MAX_PAGES * PAGE_SIZE + PAGE_SIZE;
/** Snapshot ceiling: pages read per check x PAGE_SIZE. Hitting it throws rather than diff a cut list. */
const SNAPSHOT_PAGES = 10;

export const clock = { now: (): number => Date.now() };

interface Page {
  items?: Item[];
  nextCursor?: string | null;
}

const idOf = (item: Item, stamp?: string): string => {
  if (item.uid === undefined || item.uid === null || item.uid === "") {
    throw new Error("Podium record has no stable uid");
  }
  return stamp === undefined ? String(item.uid) : `${item.uid}:${String(item[stamp] ?? "")}`;
};

/**
 * A newest-first feed over a Podium list action (brief 9.1 a): one literal page of 100. `order`
 * is sent when the action takes it (appointments, calls); feedback, reviews, review invites and
 * campaigns are newest first by Podium's documented default (see each action's description). With
 * `stamp` the id is `<uid>:<stamp>` so an edit fires again (brief 9.2).
 */
export function feedTrigger(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<never>;
  /** Extra action input (`order: "desc"` for the actions that take it). */
  input?: Record<string, unknown>;
  /** Action input for the page size; false for an action that cannot take a `limit`. */
  paged?: boolean;
  stamp?: string;
  params?: Param[];
  extra?: (params: Record<string, unknown>) => Record<string, unknown>;
  output: OutputField[];
  sample: Record<string, unknown>;
}): TriggerDefinition {
  return pollFromListAction<Record<string, unknown>>({
    key: spec.key,
    title: spec.title,
    description: spec.description,
    action: spec.action as unknown as ActionDefinition,
    params: spec.params,
    input: (params) => ({
      ...(spec.extra?.(params) ?? {}),
      ...(spec.input ?? {}),
      ...(spec.paged === false ? {} : { limit: PAGE_SIZE }),
    }),
    items: (result) => (result as Page).items ?? [],
    idOf: (item) => idOf(item as Item, spec.stamp),
    output: spec.output,
    sample: spec.sample,
    maxPages: 1,
  });
}

/**
 * A since-filter feed (brief 9.1 b): the action's own updated-after filter set to `cursor - overlap`,
 * paged with Podium's cursor (a cursor carries its filters, so later pages send it alone). A window
 * longer than {@link MAX_PAGES} pages persists the next cursor and resumes on the next check (9.8);
 * the seed stores `floor = now` so nothing that predates the trigger ever fires (9.9). The id is
 * `<uid>:<updatedAt>`, so an edit is a new event.
 */
export function updatedSinceTrigger(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<never>;
  /** Action input key that takes the ISO lower bound. */
  sinceKey: string;
  output: OutputField[];
  sample: Record<string, unknown>;
}): TriggerDefinition {
  const action = spec.action as unknown as ActionDefinition;
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [],
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    poll({ state }, ctx) {
      return pollWindow<Item, string>({
        state,
        now: clock.now(),
        overlapMs: OVERLAP_MS,
        maxPages: MAX_PAGES,
        pageSize: PAGE_SIZE,
        seenWindow: SEEN_WINDOW,
        idOf: (item) => idOf(item, "updatedAt"),
        tsOf: (item) => toMs(item.updatedAt),
        async load(sinceMs, cursor) {
          const page = await action.execute(
            cursor === undefined
              ? { [spec.sinceKey]: new Date(sinceMs).toISOString(), limit: PAGE_SIZE }
              : { cursor, limit: PAGE_SIZE },
            ctx,
          ) as Page;
          return { items: page.items ?? [], next: page.nextCursor ?? undefined };
        },
      });
    },
  };
}

/**
 * A small whole collection (locations, users) read page by page (up to {@link SNAPSHOT_PAGES}
 * pages of 100) and diffed by uid; added only (brief 9.1 c). A longer list throws instead of
 * diffing a cut-off snapshot.
 */
export function snapshotTrigger(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<never>;
  output: OutputField[];
  sample: Record<string, unknown>;
}): TriggerDefinition {
  const action = spec.action as unknown as ActionDefinition;
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [],
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ state }, ctx) {
      const items: Item[] = [];
      let cursor: string | undefined;
      for (let page = 0; page < SNAPSHOT_PAGES; page++) {
        const res = await action.execute(
          cursor === undefined ? { limit: PAGE_SIZE } : { cursor, limit: PAGE_SIZE },
          ctx,
        ) as Page;
        items.push(...(res.items ?? []));
        cursor = res.nextCursor ?? undefined;
        if (cursor === undefined) break;
      }
      if (cursor !== undefined) {
        throw new Error(
          `${spec.key}: more than ${
            SNAPSHOT_PAGES * PAGE_SIZE
          } records; a snapshot cannot be taken`,
        );
      }
      const byId = new Map(items.map((i) => [idOf(i), i]));
      const { events, nextState } = await pollSnapshot({
        state,
        rows: items.map((i) => ({ key: idOf(i), values: { uid: i.uid } })),
        emit: { added: true, updated: false },
      });
      return { events: events.map((e) => byId.get(e.key)), nextState };
    },
  };
}
