import type { ActionDefinition } from "@w6w/types";
import { compact, need, SeamlessClient, segment, toList } from "../lib/client.ts";

/** `POST /api/client/v2/campaigns/{id}/contacts` — Add Contacts to Campaign. */
interface Input {
  id: string;
  contactIds: unknown;
}

const campaignContactsAdd: ActionDefinition<Input> = {
  key: "campaign-contacts-add",
  type: "perform",
  resource: "campaign",
  title: "Add Contacts to Campaign",
  description: "Enroll researched contacts in a campaign.",
  idempotent: false,
  params: [
    {
      key: "id",
      label: "Campaign ID",
      type: "string",
      required: true,
      hint: "Campaign ID from the matching list action.",
    },
    {
      key: "contactIds",
      label: "Contact IDs",
      type: "json",
      required: true,
      hint: "Contact IDs from contacts-list (as strings).",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "data", type: "object", label: "contactsAdded and the campaign" },
  ],

  async execute(input, ctx) {
    return await new SeamlessClient(ctx).request(
      "POST",
      `/campaigns/${segment(input.id, "Campaign ID")}/contacts`,
      { body: compact({ contactIds: need(toList(input.contactIds), "Contact IDs") }) },
    );
  },
};

export default campaignContactsAdd;
