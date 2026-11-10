import type { TriggerDefinition } from "@w6w/types";
import listInstagramAccounts from "../actions/list-instagram-accounts.ts";
import { idField, newRecords } from "../lib/triggers.ts";

const PAGE_SIZE = 100;
const MAX_PAGES = 5;

/**
 * `GET /me/accounts` lists the Facebook Pages the connected user manages, each with its linked
 * Instagram account; it has no order or filter, but the set is small
 * (https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/user/accounts,
 * verified 2026-11-10). Every check reads up to MAX_PAGES pages through `list-instagram-accounts`
 * and diffs the Page ids (`pollSnapshot`, added only); more than that fails loudly.
 */
const trigger: TriggerDefinition = {
  key: "new-instagram-account",
  title: "New Instagram Account",
  description:
    "The run gets each Facebook Page that newly appears in the connected user's managed Pages, with its linked Instagram professional account.",
  output: [
    { key: "id", type: "string", label: "Facebook Page ID" },
    { key: "name", type: "string", label: "Page name" },
    { key: "instagram_business_account", type: "object", label: "Linked Instagram account" },
  ],
  sample: {
    id: "1000000000001",
    name: "Sample Page",
    instagram_business_account: { id: "17841400000000003", username: "sample_user" },
  },
  minIntervalMs: 900_000,
  async poll({ state }, ctx) {
    const items: unknown[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const res = await listInstagramAccounts.execute({ limit: PAGE_SIZE, cursor }, ctx);
      items.push(...(res.data ?? []));
      cursor = res.paging?.next ? res.paging.cursors?.after : undefined;
      if (!cursor) break;
    }
    if (cursor) {
      throw new Error(
        `The connected user manages more than ${
          MAX_PAGES * PAGE_SIZE
        } Pages; New Instagram Account cannot snapshot that many`,
      );
    }
    return newRecords({ state, items, idOf: idField, what: "a Page" });
  },
};

export default trigger;
