import type { ActionDefinition } from "@w6w/types";
import { AnchorClient, compact } from "../lib/client.ts";

/** `POST /proposals` — Anchor operation `publishProposal`. */
interface Input {
  draftId: string;
  notifyPolicy?: string;
}

const proposalPublish: ActionDefinition<Input> = {
  key: "proposal-publish",
  type: "perform",
  resource: "proposal",
  title: "Publish Proposal",
  description: "Publish a draft as a proposal and send it to the client.",
  idempotent: false,
  params: [
    { key: "draftId", label: "Draft ID", type: "string", required: true },
    {
      key: "notifyPolicy",
      label: "Notify client",
      type: "select",
      hint:
        "notify emails the client; silent publishes without an email. Anchor defaults to notify.",
    },
  ],
  output: [
    { key: "proposalId", type: "string", label: "New proposal ID" },
  ],

  execute(input, ctx) {
    return new AnchorClient(ctx).request("POST", "/proposals", {
      body: compact({ draftId: input.draftId, notifyPolicy: input.notifyPolicy }),
    });
  },
};

export default proposalPublish;
