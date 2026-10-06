import type { ActionDefinition } from "@w6w/types";
import { CertifierClient } from "../lib/client.ts";
import { credentialBody, type CredentialInput } from "../lib/body.ts";
import {
  customAttributesParam,
  expiryDateParam,
  groupIdParam,
  issueDateParam,
  recipientEmailParam,
  recipientNameParam,
} from "../lib/params.ts";

const credentialCreate: ActionDefinition<CredentialInput> = {
  key: "credential-create",
  type: "perform",
  resource: "credential",
  title: "Create Credential (Draft)",
  description:
    "Create a credential in `draft` status. Issue it, then send it, as separate steps; or use " +
    "Create, Issue and Send Credential to do all three in one call.",
  // Certifier documents no idempotency key; a retry creates a second draft.
  idempotent: false,
  params: [
    groupIdParam,
    recipientNameParam,
    recipientEmailParam,
    issueDateParam,
    expiryDateParam,
    customAttributesParam,
  ],
  output: [
    { key: "id", type: "string", label: "Credential ID" },
    { key: "publicId", type: "string", label: "Public ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "recipient", type: "object", label: "Recipient" },
  ],

  execute(input, ctx) {
    return new CertifierClient(ctx).json("/credentials", {
      method: "POST",
      body: credentialBody(input),
    });
  },
};

export default credentialCreate;
