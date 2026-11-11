import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listGroupInterests from "../actions/list-group-interests.ts";

interface Params {
  listId?: string;
  categoryId?: string;
}

interface Interest {
  id?: unknown;
}

const PAGE = 1000;
const MAX_PAGES = 5;

/**
 * Small bounded collection (brief §9.1 c): the interests of ONE interest category. Mailchimp
 * reads them with `GET /lists/{list_id}/interest-categories/{id}/interests`, `count` up to 1000
 * (https://mailchimp.com/developer/marketing/api/interests/list-interests-in-category/ , verified
 * 2026-11-10), and sends no webhook for an added interest, so the list is compared check to
 * check. Up to five pages are read; a category larger than that is refused, not compared partly.
 */
const trigger: TriggerDefinition<Params> = {
  key: "new-group-interest",
  title: "New Group Interest",
  description:
    "Fires when a new interest (a checkbox, radio or dropdown option) is added to a group in a Mailchimp audience. The run gets the interest.",
  params: [
    {
      key: "listId",
      label: "Audience",
      type: "string",
      required: true,
      hint: "The audience (list) ID.",
    },
    {
      key: "categoryId",
      label: "Interest category",
      type: "string",
      required: true,
      hint: "The ID of the group (interest category) whose options to watch.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Interest ID" },
    { key: "category_id", type: "string", label: "Category ID" },
    { key: "list_id", type: "string", label: "Audience ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "subscriber_count", type: "string", label: "Subscribers" },
    { key: "display_order", type: "number", label: "Display order" },
  ],
  sample: {
    id: "a1b2c3d4e5",
    category_id: "f6g7h8i9j0",
    list_id: "a6b5da1054",
    name: "Weekly digest",
    subscriber_count: "0",
    display_order: 1,
  },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const listId = params.listId?.trim();
    const categoryId = params.categoryId?.trim();
    if (!listId || !categoryId) {
      throw new Error("Set Audience and Interest category to the group to watch.");
    }
    const rows: Interest[] = [];
    let total = 0;
    for (let page = 0; page < MAX_PAGES; page++) {
      const out = await listGroupInterests.execute(
        { listId, categoryId, count: PAGE, offset: page * PAGE },
        ctx,
      ) as { interests?: Interest[]; total_items?: number };
      const got = Array.isArray(out?.interests) ? out.interests : [];
      rows.push(...got);
      total = typeof out?.total_items === "number" ? out.total_items : rows.length;
      if (got.length < PAGE || rows.length >= total) break;
    }
    if (rows.length < total) {
      throw new Error(
        "Mailchimp has more interests in this group than New Group Interest can compare; use a smaller group.",
      );
    }
    const { events, nextState } = await pollSnapshot({
      state,
      rows: rows.map((row) => ({ key: String(row.id ?? ""), values: row })),
      emit: { added: true, updated: false, removed: false },
    });
    return { events: events.map((change) => change.values), nextState };
  },
};

export default trigger;
