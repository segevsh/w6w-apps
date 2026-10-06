import type { ActionDefinition } from "@w6w/types";
import { compact, need, SeamlessClient, segment, toList } from "../lib/client.ts";

/** `DELETE /api/client/v2/campaigns/{id}/contacts` — Remove Contacts from Campaign. */
interface Input {
  id: string;
  contactIds: unknown;
}

const campaignContactsRemove: ActionDefinition<Input> = {
  key: "campaign-contacts-remove",
  type: "perform",
  resource: "campaign",
  title: "Remove Contacts from Campaign",
  description: "Remove contacts from a campaign.",
  idempotent: true,
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
      hint: "Contact IDs to remove (as strings).",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
  ],

  async execute(input, ctx) {
    return await new SeamlessClient(ctx).request(
      "DELETE",
      `/campaigns/${segment(input.id, "Campaign ID")}/contacts`,
      { body: compact({ contactIds: need(toList(input.contactIds), "Contact IDs") }) },
    );
  },
};

export default campaignContactsRemove;
