import type { HookContext, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import userList from "../actions/user-list.ts";

/** The kit's snapshot cap; a walk that reaches it fails loudly instead of missing users. */
const MAX_ROWS = 5000;
const PAGE_SIZE = 500;
/** 5000 rows / 500 per page, plus one page to prove the cap was crossed. */
const MAX_PAGES = 11;

/**
 * Shape (c): the whole workspace user list is walked (`/v1/users`, `limit` max 500 per Hex's OpenAPI
 * document, `after` cursor) and diffed with `pollSnapshot`. The order is irrelevant to a snapshot,
 * but is pinned (`NAME` ascending, the documented default) so the cursor walk is deterministic.
 */
export default {
  key: "new-user",
  title: "New User",
  description: "The run gets each new workspace user.",
  output: [{ key: "id", type: "string", label: "User ID" }],
  sample: { id: "user-1", email: "ada@example.com" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx: HookContext) {
    const rows: Array<{ key: string; values: unknown }> = [];
    let after: string | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const res = await userList.execute({
        limit: PAGE_SIZE,
        sortBy: "NAME",
        sortDirection: "ASC",
        after,
      }, ctx) as { values?: Array<{ id?: unknown }>; pagination?: { after?: string | null } };
      for (const u of res.values ?? []) rows.push({ key: String(u.id ?? ""), values: u });
      after = res.pagination?.after ?? undefined;
      if (!after) break;
    }
    if (after) {
      throw new Error(
        `new-user: more than ${MAX_ROWS} workspace users; the snapshot trigger cannot cover it`,
      );
    }
    const { events, nextState } = await pollSnapshot({
      state,
      rows,
      emit: { added: true },
      maxRows: MAX_ROWS,
    });
    return { events: events.map((e) => e.values), nextState };
  },
} satisfies TriggerDefinition;
