import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import tableList from "../actions/table-list.ts";

/** Pipefy's maximum page size for a connection (limits-and-best-practices, verified 2026-11-10) and the most pages one check walks. */
const PAGE = 50;
const MAX_PAGES = 20;

/**
 * `table-list`: `organization(id) { tables(first, after) { edges pageInfo } }` is a Relay connection
 * that returns at most 50 rows a page (https://developers.pipefy.com/reference/limits-and-best-practices
 * and /pagination-basics, verified 2026-11-10) and documents no order. The check therefore walks every page
 * by cursor (`first: 50`, `after: endCursor` while `hasNextPage`), up to 20 pages (1000 tables); an organization
 * above that fails the check with an error naming the cap rather than silently missing tables. Additions only
 * (renames and removals are ignored); a table listed twice because the set shifted between pages counts once.
 */
const trigger: TriggerDefinition<{ organizationId: string }> = {
  key: "new-table",
  title: "New Database Table",
  description:
    "The run gets each Database Table newly created in the chosen Pipefy organization (renames and removals are ignored; organizations of up to 1000 tables).",
  params: [
    { key: "organizationId", label: "Organization ID", type: "string", required: true },
  ],
  output: [
    { key: "change", type: "string", label: "Change" },
    { key: "key", type: "string", label: "Table ID" },
    { key: "values", type: "object", label: "Table" },
  ],
  sample: {
    change: "added",
    key: "ZtEdWh",
    values: { id: "ZtEdWh", name: "Customers" },
  },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    type Table = { id?: string; [key: string]: unknown };
    const rows = new Map<string, Table>();
    let after: string | undefined;
    for (let page = 0;; page++) {
      const result = await tableList.execute(
        { organizationId: params.organizationId, first: PAGE, after },
        ctx,
      ) as { tables?: Table[]; endCursor?: string | null; hasNextPage?: boolean };
      for (const row of result.tables ?? []) if (row.id) rows.set(String(row.id), row);
      if (result.hasNextPage !== true) break;
      if (!result.endCursor || result.endCursor === after) {
        throw new Error("Pipefy reported another page of tables but gave no new cursor.");
      }
      if (page === MAX_PAGES - 1) {
        throw new Error(
          `Pipefy organization has more than ${MAX_PAGES * PAGE} database tables (the cap).`,
        );
      }
      after = result.endCursor;
    }
    return await pollSnapshot({
      state,
      rows: [...rows].map(([key, values]) => ({ key, values })),
      emit: { added: true, updated: false },
      maxRows: 5000,
    });
  },
};

export default trigger;
