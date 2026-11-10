import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import mailingListsList from "../actions/mailing-lists-list.ts";

const PAGE_SIZE = 100;
const MAX_PAGES = 10;

/**
 * Snapshot poll (brief 9.1 c). `GET /addressbooks` documents no sort order, so the account's mailing
 * lists are watched as a snapshot: up to `MAX_PAGES` pages of `PAGE_SIZE` (1000 lists), read through
 * the action's own `limit`/`offset`. An account with more lists is refused loudly, not truncated.
 */
const trigger: TriggerDefinition = {
  key: "new-mailing-list",
  title: "New Mailing List",
  description: "The run gets each mailing list newly created in the account.",
  output: [
    { key: "id", type: "number", label: "Mailing list ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "creationdate", type: "string", label: "Created at" },
  ],
  sample: { id: 501, name: "Newsletter", creationdate: "2026-11-09 10:00:00" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const lists: Array<Record<string, unknown>> = [];
    for (let page = 0; page < MAX_PAGES; page++) {
      const res = await mailingListsList.execute(
        { limit: PAGE_SIZE, offset: page * PAGE_SIZE },
        ctx,
      ) as Array<Record<string, unknown>> | { data?: Array<Record<string, unknown>> };
      const rows = Array.isArray(res) ? res : res.data ?? [];
      lists.push(...rows);
      if (rows.length < PAGE_SIZE) break;
      if (page === MAX_PAGES - 1) {
        throw new Error(
          `the account has more than ${
            MAX_PAGES * PAGE_SIZE
          } mailing lists: the new-mailing-list trigger watches at most ${MAX_PAGES * PAGE_SIZE}`,
        );
      }
    }
    const { events, nextState } = await pollSnapshot({
      state,
      emit: { added: true, updated: false },
      rows: lists.map((l) => ({ key: String(l.id), values: l })),
    });
    return { events: events.map((e) => e.values), nextState };
  },
};

export default trigger;
