import type { ActionDefinition, HookContext, OutputField, TriggerDefinition } from "@w6w/types";
import { pollWindow, toMs } from "./window.ts";
import { clock, MAX_PAGES, OVERLAP_MS, SEEN_WINDOW } from "./triggers.ts";

interface Rec {
  id: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * The "new" and "new or updated" pair for one Clio record type, over the app's own list action. Every
 * Clio index endpoint takes `created_since` / `updated_since` (ISO-8601) and lists by `id(asc)`, so
 * each check reads `since = cursor - overlap` for at most `MAX_PAGES` pages and de-duplicates by id.
 * A longer window is resumed from the persisted page token (brief 9.8); the seed stores
 * `floor = now` and later checks drop records stamped before it (brief 9.9).
 */
export function recordTriggers(spec: {
  noun: string;
  /** The list action, which must accept `createdSince`, `updatedSince`, `fields`, `limit`, `pageToken`. */
  action: ActionDefinition;
  fields: string;
  output: OutputField[];
  sample: Record<string, unknown>;
}): { newTrigger: TriggerDefinition; updatedTrigger: TriggerDefinition } {
  const slug = spec.noun.toLowerCase().replaceAll(" ", "-");
  function check(mode: "new" | "updated", state: unknown, ctx: HookContext) {
    return pollWindow<Rec, string>({
      state,
      now: clock.now(),
      overlapMs: OVERLAP_MS,
      maxPages: MAX_PAGES,
      pageSize: 100,
      seenWindow: SEEN_WINDOW,
      idOf: (r) => (mode === "new" ? String(r.id) : `${r.id}:${r.updated_at}`),
      tsOf: (r) => toMs(mode === "new" ? r.created_at : r.updated_at),
      async load(sinceMs, pageToken) {
        const since = new Date(sinceMs).toISOString();
        const res = await spec.action.execute!({
          ...(mode === "new" ? { createdSince: since } : { updatedSince: since }),
          fields: spec.fields,
          limit: 100,
          pageToken,
        }, ctx) as { items?: Rec[]; nextPageToken?: string };
        return { items: res.items ?? [], next: res.nextPageToken };
      },
    });
  }
  return {
    newTrigger: {
      key: `new-${slug}`,
      title: `New ${spec.noun}`,
      description: `The run gets each newly created Clio ${spec.noun.toLowerCase()}.`,
      output: spec.output,
      sample: { ...spec.sample, updated_at: spec.sample.created_at },
      minIntervalMs: 300_000,
      poll: ({ state }, ctx) => check("new", state, ctx),
    },
    updatedTrigger: {
      key: `new-or-updated-${slug}`,
      title: `New or Updated ${spec.noun}`,
      description: `The run gets each Clio ${spec.noun.toLowerCase()} that is created or edited.`,
      output: spec.output,
      sample: spec.sample,
      minIntervalMs: 300_000,
      poll: ({ state }, ctx) => check("updated", state, ctx),
    },
  };
}
