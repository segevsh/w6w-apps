import type { ActionDefinition, OutputField } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listCampaigns from "../actions/list-campaigns.ts";

interface Params {
  listId?: string;
}

function campaigns(result: unknown): unknown[] {
  const value = result as { campaigns?: unknown[] };
  return Array.isArray(value.campaigns) ? value.campaigns : [];
}

function campaignId(item: unknown): string {
  const id = (item as { id?: unknown }).id;
  if (typeof id !== "string" || !id) throw new Error("Mailchimp campaign has no id.");
  return id;
}

const output: OutputField[] = [
  { key: "id", type: "string", label: "Campaign ID" },
  { key: "web_id", type: "number", label: "Web ID" },
  { key: "type", type: "string", label: "Type" },
  { key: "create_time", type: "string", label: "Created" },
  { key: "status", type: "string", label: "Status" },
  { key: "send_time", type: "string", label: "Send time" },
  { key: "settings", type: "object", label: "Settings (title, subject line...)" },
  { key: "recipients", type: "object", label: "Recipients (audience)" },
];

/**
 * Newest-first (brief §9.1 a): `GET /campaigns` takes `sort_field=create_time` and `sort_dir=DESC`
 * (https://mailchimp.com/developer/marketing/api/campaigns/list-campaigns/ , verified 2026-11-10),
 * so page one holds the newest campaigns. The wrapped action's default `fields` leave out
 * `create_time`, so the request names the fields it needs.
 */
export default pollFromListAction<Params>({
  key: "new-campaign",
  title: "New Campaign",
  description:
    "Fires when a campaign is newly created in the Mailchimp account. The run gets the campaign.",
  action: listCampaigns as unknown as ActionDefinition,
  params: [{
    key: "listId",
    label: "Audience",
    type: "string",
    hint: "Only campaigns sent to this audience (list ID). Leave empty for every campaign.",
  }],
  input: ({ listId }) => ({
    listId: listId?.trim() || undefined,
    sortField: "create_time",
    sortDirection: "DESC",
    count: 50,
    offset: 0,
    fields: [
      "campaigns.id",
      "campaigns.web_id",
      "campaigns.type",
      "campaigns.create_time",
      "campaigns.status",
      "campaigns.send_time",
      "campaigns.settings.title",
      "campaigns.settings.subject_line",
      "campaigns.recipients.list_id",
    ],
  }),
  items: campaigns,
  idOf: campaignId,
  output,
  sample: {
    id: "5aa2102003",
    web_id: 3012345,
    type: "regular",
    create_time: "2026-11-09T10:00:00+00:00",
    status: "save",
    send_time: "",
    settings: { title: "Autumn newsletter", subject_line: "News from us" },
    recipients: { list_id: "a6b5da1054" },
  },
});
