import type { ActionDefinition } from "@w6w/types";
import { AnchorClient, asJson, compact } from "../lib/client.ts";

/** `POST /v2/proposal-drafts/from-template` — Anchor operation `createProposalDraftFromTemplate`. */
interface Input {
  proposalTemplateId: string;
  contactId?: string;
  metadata?: unknown;
}

function parseJson(value: unknown, label: string): unknown {
  return asJson(value, label);
}

const proposalDraftCreateFromTemplate: ActionDefinition<Input> = {
  key: "proposal-draft-create-from-template",
  type: "perform",
  resource: "proposal-draft",
  title: "Create Proposal Draft From Template",
  description: "Clone a proposal template into a new draft, optionally linked to a client contact.",
  idempotent: false,
  params: [
    { key: "proposalTemplateId", label: "Proposal template ID", type: "string", required: true },
    {
      key: "contactId",
      label: "Contact ID",
      type: "string",
      hint: "Omit for a contactless draft; attach a client later with Update Proposal Draft.",
    },
    {
      key: "metadata",
      label: "Metadata",
      type: "json",
      hint: "Flat JSON object with string values only.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "New draft ID" },
  ],

  execute(input, ctx) {
    return new AnchorClient(ctx).request("POST", "/v2/proposal-drafts/from-template", {
      body: compact({
        proposalTemplateId: input.proposalTemplateId,
        contactId: input.contactId,
        metadata: input.metadata === undefined || input.metadata === ""
          ? undefined
          : parseJson(input.metadata, "metadata"),
      }),
    });
  },
};

export default proposalDraftCreateFromTemplate;
