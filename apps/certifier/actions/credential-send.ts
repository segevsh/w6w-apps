import type { ActionDefinition } from "@w6w/types";
import { CertifierClient, encodeId } from "../lib/client.ts";
import { credentialIdParam } from "../lib/params.ts";

interface Input {
  credentialId: string;
}

const credentialSend: ActionDefinition<Input> = {
  key: "credential-send",
  type: "perform",
  resource: "credential",
  title: "Send Credential",
  description:
    "Email an `issued` credential to its recipient. Only issued credentials with a recipient " +
    "email can be sent.",
  // Every call sends another email.
  idempotent: false,
  params: [credentialIdParam],
  output: [
    { key: "id", type: "string", label: "Credential ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "recipient", type: "object", label: "Recipient" },
  ],

  execute(input, ctx) {
    return new CertifierClient(ctx).json(`/credentials/${encodeId(input.credentialId)}/send`, {
      method: "POST",
      // `email` is the only delivery method the API offers today.
      body: { deliveryMethod: "email" },
    });
  },
};

export default credentialSend;
