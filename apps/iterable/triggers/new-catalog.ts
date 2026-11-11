import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listCatalogs from "../actions/list-catalogs.ts";

const PAGE_SIZE = 100;
const MAX_PAGES = 10;

/**
 * `GET /api/catalogs` lists catalog names page by page (page from 1, `pageSize`;
 * https://api.iterable.com/api-docs, "Get catalog names"). A project holds a handful of catalogs,
 * so one check reads at most 10 pages of 100 and diffs the names (`pollSnapshot`, added only).
 */
const trigger: TriggerDefinition = {
  key: "new-catalog",
  title: "New Catalog",
  description: "The run gets each newly created catalog.",
  minIntervalMs: 300_000,
  output: [{ key: "name", type: "string", label: "Catalog name" }],
  sample: { name: "products" },
  async poll({ state }, ctx) {
    const names: string[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const out = await listCatalogs.execute({ page, pageSize: PAGE_SIZE }, ctx) as {
        catalogNames?: Array<{ name?: unknown }>;
      };
      const got = (out.catalogNames ?? []).map((c) => String(c.name ?? "")).filter(Boolean);
      names.push(...got);
      if (got.length < PAGE_SIZE) break;
    }
    const { events, nextState } = await pollSnapshot({
      state,
      rows: names.map((name) => ({ key: name, values: { name } })),
      emit: { added: true, updated: false },
    });
    return { events: events.map((e) => ({ name: e.key })), nextState };
  },
};

export default trigger;
