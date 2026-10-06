import type { ActionDefinition } from "@w6w/types";
import { ActionNetworkClient, compact, need, seg } from "../lib/client.ts";
import { idParam, type Input } from "../lib/factory.ts";
import {
  AUTORESPONSE_PARAM,
  BACKGROUND_PARAM,
  helperBody,
  PERSON_PARAMS,
  recordOutput,
  REFERRER_PARAMS,
  TAG_OP_PARAMS,
} from "../lib/person.ts";

/** Record Signature Helper: `POST /petitions/{id}/signatures` with an inline person. */
const signatureRecord: ActionDefinition<Input> = {
  key: "signature-record",
  type: "perform",
  resource: "signature",
  title: "Record Signature",
  description:
    "Record that a person signed a petition, creating or updating the person in the same call. A person signs a petition once; recording again replaces the earlier signature. Does not send an autoresponse unless asked.",
  idempotent: true,
  params: [
    idParam("petitionId", "Petition ID"),
    { key: "comments", label: "Comments", type: "text", hint: "Left by the signer." },
    ...PERSON_PARAMS,
    ...TAG_OP_PARAMS,
    ...REFERRER_PARAMS,
    AUTORESPONSE_PARAM,
    BACKGROUND_PARAM,
  ],
  output: recordOutput({ key: "comments", type: "string", label: "Comment" }),

  execute(input, ctx) {
    const body = helperBody(input, compact({ comments: input.comments }), { autoresponse: true });
    return new ActionNetworkClient(ctx).create(
      `/petitions/${seg(need(input, "petitionId"))}/signatures`,
      body,
      input.backgroundRequest === true,
    );
  },
};

export default signatureRecord;
