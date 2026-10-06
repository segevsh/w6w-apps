import type { ActionDefinition } from "@w6w/types";
import { compact, FindymailClient, intList, jsonValue } from "../lib/client.ts";

interface Input {
  query: string;
  limit?: number;
  find_contact?: boolean;
  find_email?: boolean;
  find_phone?: boolean;
  target_job_titles?: unknown;
  lead_list_id?: number;
  mode?: string;
  require_email?: boolean;
  add_to_exclusion_list?: boolean;
  exclusion_list_id?: number;
  exclusion_filter_list_ids?: string;
}

const intellimatchSearch: ActionDefinition<Input> = {
  key: "intellimatch-search",
  type: "perform",
  resource: "intellimatch",
  title: "Intellimatch Search",
  description:
    "Start an Intellimatch task: plain-language company search with optional contact, email and phone enrichment. Returns a `hash`; poll Intellimatch Status, then fetch Intellimatch Results. Email costs 1 credit per email found and phone 10 credits per phone found.",
  idempotent: false,
  params: [
    {
      "key": "query",
      "label": "Query",
      "type": "text",
      "required": true,
      "hint": "Plain-language description of the target companies.",
    },
    {
      "key": "limit",
      "label": "Limit",
      "type": "number",
      "hint": "Maximum companies to export (default 100, max 5000).",
    },
    { "key": "find_contact", "label": "Find contacts", "type": "boolean" },
    {
      "key": "find_email",
      "label": "Find emails",
      "type": "boolean",
      "hint": "1 credit per email found.",
    },
    {
      "key": "find_phone",
      "label": "Find phones",
      "type": "boolean",
      "hint": "10 credits per phone found.",
    },
    {
      "key": "target_job_titles",
      "label": "Target job titles",
      "type": "json",
      "hint":
        'Ordered priority tiers, each a list of equivalent titles, e.g. [["CEO","Founder"],["CTO"]]. Tier 1 is tried first; at most 3 tiers.',
    },
    {
      "key": "lead_list_id",
      "label": "Lead list ID",
      "type": "number",
      "hint": "Add found contacts to this list.",
    },
    {
      "key": "mode",
      "label": "Mode",
      "type": "select",
      "hint": "Defaults to broad.",
      "options": [{ "value": "broad", "label": "Broad" }, {
        "value": "targeted",
        "label": "Targeted",
      }],
    },
    {
      "key": "require_email",
      "label": "Require email",
      "type": "boolean",
      "hint":
        "Only return companies with an email found (needs find contacts and find emails); others are not charged.",
    },
    { "key": "add_to_exclusion_list", "label": "Add to exclusion list", "type": "boolean" },
    {
      "key": "exclusion_list_id",
      "label": "Exclusion list ID",
      "type": "number",
      "hint": "Where to add domains when adding to an exclusion list.",
    },
    {
      "key": "exclusion_filter_list_ids",
      "label": "Exclusion filter list IDs",
      "type": "string",
      "hint": "Comma-separated. Default 0 = the global list, -1 = no filter.",
    },
  ],
  output: [{
    "key": "hash",
    "type": "string",
    "label": "Task hash — poll Intellimatch Status with it",
  }],

  async execute(input, ctx) {
    const config = compact({
      find_contact: input.find_contact,
      find_email: input.find_email,
      find_phone: input.find_phone,
      target_job_titles: jsonValue(input.target_job_titles),
      lead_list_id: input.lead_list_id,
      mode: input.mode,
      require_email: input.require_email,
      add_to_exclusion_list: input.add_to_exclusion_list,
      exclusion_list_id: input.exclusion_list_id,
      exclusion_filter_list_ids: intList(
        input.exclusion_filter_list_ids,
        "Exclusion filter list IDs",
      ),
    });
    return await new FindymailClient(ctx).request("POST", "/api/intellimatch/search", {
      body: compact({
        query: input.query,
        limit: input.limit,
        config: Object.keys(config).length > 0 ? config : undefined,
      }),
    });
  },
};

export default intellimatchSearch;
