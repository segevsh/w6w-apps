import type { ActionDefinition, OutputField, TriggerDefinition } from "@w6w/types";
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
    items: (result) => (result as { data?: unknown[] }).data ?? [],
    idOf: (item) => String((item as RecordItem).id ?? ""),
    stampOf: stamp,
    markOf: (previous, items) => lastId(items) ?? previous,
    output: spec.output,
    sample: spec.sample,
  });
}
