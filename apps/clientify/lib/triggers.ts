import type { ActionDefinition } from "@w6w/types";
import { sinceTrigger, toMs } from "./since.ts";

interface Record_ {
  id?: number | string;
  modified?: string;
  created?: string;
}

/** Clientify filters on dates, not times: `created[gte]=2020/01/01` (https://developer.clientify.com). */
export function filterDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10).replaceAll("-", "/");
}

/**
 * Poll one Clientify list action with a `created[gte]` / `modified[gte]` day filter, 100 per page.
 * The window is a whole UTC day, so most of it is already seen and the id dedupe drops it.
 */
export function clientifyPoll(o: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<{ page?: number; filters?: unknown }>;
  field: "created" | "modified";
  withStamp: boolean;
  output: Array<{ key: string; type: "string" | "number" | "object"; label: string }>;
  sample: unknown;
}) {
  return sinceTrigger<Record_>({
    key: o.key,
    title: o.title,
    description: o.description,
    output: o.output,
    sample: o.sample,
    async fetchPage(sinceMs, page, ctx) {
      const res = await o.action.execute({
        page,
        filters: { [`${o.field}[gte]`]: filterDate(sinceMs) },
      }, ctx) as { results?: Record_[]; next?: string | null };
      return { items: res.results ?? [], more: typeof res.next === "string" && res.next !== "" };
    },
    tsOf: (r) => toMs(r[o.field]),
    idOf: (r) => o.withStamp ? `${r.id}:${r.modified ?? ""}` : String(r.id),
  });
}
