import type { ActionDefinition } from "@w6w/types";
import { AnchorClient, compact, encodeId } from "../lib/client.ts";

/** `PATCH /v2/proposal-drafts/{id}` — Anchor operation `updateProposalDraftV2`. */
interface Input {
  id: string;
  agreementName?: string;
  contactId?: string;
  effectiveDate?: string;
}

const proposalDraftUpdate: ActionDefinition<Input> = {
  key: "proposal-draft-update",
  type: "perform",
  resource: "proposal-draft",
  title: "Update Proposal Draft",
  description:
    "Change a draft's own fields. Only the fields you send change; services, packages and legal terms are not editable here.",
  idempotent: true,
  params: [
    { key: "id", label: "Draft ID", type: "string", required: true },
    { key: "agreementName", label: "Agreement name", type: "string" },
    {
      key: "contactId",
      label: "Contact ID",
      type: "string",
      hint: "Attach or change the client contact.",
    },
    {
      key: "effectiveDate",
      label: "Effective date",
      type: "string",
      hint: "Date string, yyyy-MM-dd.",
    },
  ],
  output: [
    { key: "draftId", type: "string", label: "Draft ID" },
  ],

  execute(input, ctx) {
    return new AnchorClient(ctx).request("PATCH", `/v2/proposal-drafts/${encodeId(input.id)}`, {
      body: compact({
        agreementName: input.agreementName,
        contactId: input.contactId,
        effectiveDate: input.effectiveDate,
      }),
    });
  },
};

export default proposalDraftUpdate;
