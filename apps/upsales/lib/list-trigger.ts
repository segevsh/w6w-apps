import type { ActionDefinition, HookContext, OutputField, TriggerDefinition } from "@w6w/types";
import type { ListResult } from "./client.ts";
import { walkTrigger } from "./walk.ts";

const PAGE = 1000;
type RecordItem = { id?: unknown; regDate?: unknown; createdAt?: unknown; created?: unknown };

function lastId(items: unknown[]): number | undefined {
  const id = Number((items.at(-1) as RecordItem | undefined)?.id);
  return Number.isFinite(id) && id > 0 ? id : undefined;
}

function stamp(item: unknown): number | undefined {
  const row = item as RecordItem;
  const value = row.regDate ?? row.createdAt ?? row.created;
  const at = Date.parse(String(value ?? ""));
  return Number.isNaN(at) ? undefined : at;
}

/** Build an id-crawl trigger for an Upsales collection. The API documents this as its safe list form. */
export function listTrigger(spec: {
  key: string;
  title: string;
  action: ActionDefinition;
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition {
  return walkTrigger({
    key: spec.key,
    title: spec.title,
    description: `The run gets each newly created ${spec.title.slice(4).toLowerCase()}.`,
    action: spec.action as never,
    first: ({ mark }) => ({
      limit: PAGE,
      sort: "id",
      filter: { id: `gt:${Number(mark) || 0}` },
    }),
    next: (_request, _result, items) =>
      items.length >= PAGE
        ? { limit: PAGE, sort: "id", filter: { id: `gt:${lastId(items) ?? 0}` } }
        : undefined,
    // Collections that show no creation stamp (products, comments, tickets, users) cannot be told
    // apart from new rows by time, so the seed stores the newest id as the position to crawl from.
    seed: async (_o, ctx) => {
      const run = spec.action.execute as (i: unknown, c: HookContext) => Promise<ListResult>;
      const total = Number((await run({ limit: 1 }, ctx)).total);
      if (!(total > 0)) return 0;
      const newest = await run({ limit: 1, sort: "id", offset: total - 1 }, ctx);
      const id = lastId(newest.data ?? []);
      // The newest row vanished between the two reads: storing 0 would flood, so retry next check.
      if (id === undefined) {
        throw new Error("Upsales seed: newest row not found, retrying next check");
      }
      return id;
    },
    items: (result) => (result as { data?: unknown[] }).data ?? [],
    idOf: (item) => String((item as RecordItem).id ?? ""),
    stampOf: stamp,
    markOf: (previous, items) => lastId(items) ?? previous,
    output: spec.output,
    sample: spec.sample,
  });
}

type Modified = RecordItem & { modDate?: unknown };

function modStamp(item: unknown): number | undefined {
  const at = Date.parse(String((item as Modified).modDate ?? ""));
  return Number.isNaN(at) ? undefined : at;
}

/**
 * Build a created-or-edited trigger for an Upsales collection that returns `modDate`. It asks for
 * `modDate=gte:<window start>` (id-ordered, paged by `id=gt:<last id>`), and the dedupe key joins
 * the id with the `modDate`, so a later edit of the same record is a new event.
 */
export function updatedListTrigger(spec: {
  key: string;
  title: string;
  noun: string;
  action: ActionDefinition;
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition {
  const request = (since: unknown, afterId: number) => ({
    limit: PAGE,
    sort: "id",
    filter: { modDate: `gte:${since}`, id: `gt:${afterId}` },
  });
  const sinceOf = (req: Record<string, unknown>) =>
    String((req.filter as { modDate: string }).modDate).slice(4);
  return walkTrigger({
    key: spec.key,
    title: spec.title,
    description: `The run gets each ${spec.noun} when it is created or edited.`,
    action: spec.action as never,
    first: ({ sinceMs }) => request(new Date(sinceMs).toISOString(), 0),
    next: (req, _result, items) =>
      items.length >= PAGE ? request(sinceOf(req), lastId(items) ?? 0) : undefined,
    items: (result) => (result as { data?: unknown[] }).data ?? [],
    idOf: (item) => `${(item as RecordItem).id ?? ""}@${(item as Modified).modDate ?? ""}`,
    stampOf: modStamp,
    output: spec.output,
    sample: spec.sample,
  });
}
