import type { ActionDefinition } from "@w6w/types";
import { AnchorClient, compact } from "../lib/client.ts";

/** `POST /relationship/create-adhoc` — Anchor operation `createAdHocAgreement`. */
interface Input {
  clientContactId: string;
}

const adhocAgreementGetOrCreate: ActionDefinition<Input> = {
  key: "adhoc-agreement-get-or-create",
  type: "perform",
  resource: "agreement",
  title: "Get Or Create Ad-Hoc Agreement",
  description:
    "Return the ad-hoc agreement between you and one client contact, creating it if none exists.",
  idempotent: true,
  params: [
    { key: "clientContactId", label: "Client contact ID", type: "string", required: true },
  ],
  output: [
    { key: "relationshipId", type: "string", label: "Ad-hoc agreement (relationship) ID" },
  ],

  execute(input, ctx) {
    return new AnchorClient(ctx).request("POST", "/relationship/create-adhoc", {
      body: compact({ clientContactId: input.clientContactId }),
    });
  },
};

export default adhocAgreementGetOrCreate;
