import type { ActionDefinition } from "@w6w/types";
import { AnchorClient, compact, encodeId } from "../lib/client.ts";

/** `PUT /v2/agreements/{id}/title` — Anchor operation `updateAgreementTitle`. */
interface Input {
  id: string;
  title: string;
}

const agreementRename: ActionDefinition<Input> = {
  key: "agreement-rename",
  type: "perform",
  resource: "agreement",
  title: "Rename Agreement",
  description: "Change the title of a signed agreement.",
  idempotent: true,
  params: [
    { key: "id", label: "Agreement ID", type: "string", required: true },
    { key: "title", label: "Title", type: "string", required: true },
  ],
  output: [
    { key: "ok", type: "boolean", label: "Anchor accepted the request" },
  ],

  execute(input, ctx) {
    return new AnchorClient(ctx).request("PUT", `/v2/agreements/${encodeId(input.id)}/title`, {
      body: compact({ title: input.title }),
    });
  },
};

export default agreementRename;
