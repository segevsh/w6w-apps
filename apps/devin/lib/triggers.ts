import type { OutputField, TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import sessionList from "../actions/session-list.ts";

const LIMIT = 100;
/** Seconds of look-back before the previous check, so a late-indexed session is still seen. */
export const OVERLAP_SECONDS = 120;
/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

interface Session {
  session_id?: string;
  created_at?: number;
  updated_at?: number;
}

export const sessionOutput: OutputField[] = [
  { key: "session_id", type: "string", label: "Session ID" },
  { key: "status", type: "string", label: "Status" },
  { key: "title", type: "string", label: "Title" },
  { key: "created_at", type: "number", label: "Created at (Unix seconds)" },
  { key: "updated_at", type: "number", label: "Updated at (Unix seconds)" },
];

export const sessionSample = {
  session_id: "devin-0123456789abcdef",
  status: "running",
  title: "Fix the flaky checkout test",
  created_at: 1762646400,
  updated_at: 1762646460,
};

/**
 * Since-filter poll (brief 9.1 b) on `session-list`, which documents `created_after` /
 * `updated_after` (Unix seconds, inclusive) but no sort. Each check lists sessions created (or
 * updated) since `cursor - overlap` and dedupes by id (plus the update stamp for the updated form).
 */
export function sessionPoll(o: {
  key: string;
  title: string;
  description: string;
  filter: "createdAfter" | "updatedAfter";
  idOf(s: Session): string;
}): TriggerDefinition {
  return {
    key: o.key,
    title: o.title,
    description: o.description,
    output: sessionOutput,
    sample: sessionSample,
    minIntervalMs: 300_000,
    async poll({ state }, ctx) {
      const now = clock.now();
      const prior = state as { cursor?: number } | undefined;
      const since = typeof prior?.cursor === "number" ? prior.cursor : Math.floor(now / 1000);
      const after = since - OVERLAP_SECONDS;
      const { events, nextState } = await pollNewItems<Session>({
        state,
        maxPages: 3,
        idOf: o.idOf,
        async fetchPage(cursor) {
          const res = await sessionList.execute(
            { limit: LIMIT, cursor, [o.filter]: after },
            ctx,
          ) as { items?: Session[]; nextCursor?: string };
          return { items: res.items ?? [], nextPageToken: res.nextCursor };
        },
      });
      return { events, nextState: { ...nextState, cursor: Math.floor(now / 1000) } };
    },
  };
}
