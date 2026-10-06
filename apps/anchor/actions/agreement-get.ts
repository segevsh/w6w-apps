import type { ActionDefinition } from "@w6w/types";
import { AnchorClient, encodeId } from "../lib/client.ts";

/** `GET /v2/agreements/{id}` — Anchor operation `getAgreementV2`. */
interface Input {
  id: string;
}

const agreementGet: ActionDefinition<Input> = {
  key: "agreement-get",
  type: "read",
  resource: "agreement",
  title: "Get Agreement",
  description:
    "Fetch a signed agreement (v2 shape): typed billing triggers, pending amendments and signing audit.",
  params: [
    { key: "id", label: "Agreement ID", type: "string", required: true },
  ],
  output: [
    { key: "agreementName", type: "string", label: "Agreement name" },
    { key: "agreementSettings", type: "object", label: "Agreement settings" },
    { key: "amendments", type: "array", label: "Amendments" },
  ],

  execute(input, ctx) {
    return new AnchorClient(ctx).request("GET", `/v2/agreements/${encodeId(input.id)}`);
  },
};

export default agreementGet;
