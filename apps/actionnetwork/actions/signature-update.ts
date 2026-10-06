import type { ActionDefinition } from "@w6w/types";
import { ActionNetworkClient, need, seg } from "../lib/client.ts";
import { idParam, type Input } from "../lib/factory.ts";
import { BACKGROUND_PARAM, recordOutput } from "../lib/person.ts";

/** `PUT /petitions/{id}/signatures/{signatureId}` — the comment is the editable field. */
const signatureUpdate: ActionDefinition<Input> = {
  key: "signature-update",
  type: "perform",
  resource: "signature",
  title: "Update Signature",
  description: "Change the comment on an existing petition signature.",
  idempotent: true,
  params: [
    idParam("petitionId", "Petition ID"),
    idParam("signatureId", "Signature ID"),
    { key: "comments", label: "Comments", type: "text", required: true },
    BACKGROUND_PARAM,
  ],
  output: recordOutput({ key: "comments", type: "string", label: "Comment" }),

  execute(input, ctx) {
    return new ActionNetworkClient(ctx).update(
      `/petitions/${seg(need(input, "petitionId"))}/signatures/${seg(need(input, "signatureId"))}`,
      { comments: need(input, "comments") },
      input.backgroundRequest === true,
    );
  },
};

export default signatureUpdate;
