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

const credentialCreateIssueSend: ActionDefinition<CredentialInput> = {
  key: "credential-create-issue-send",
  type: "perform",
  resource: "credential",
  title: "Create, Issue and Send Credential",
  description:
    "Create a credential, issue it and email it to the recipient in one call. This is the " +
    "all-in-one endpoint for the common case; the recipient email is what it sends to.",
  // No idempotency key: a retry emails the recipient a second credential.
  idempotent: false,
  params: [
    groupIdParam,
    recipientNameParam,
    { ...recipientEmailParam, hint: "Where the credential is emailed." },
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
    return new CertifierClient(ctx).json("/credentials/create-issue-send", {
      method: "POST",
      body: credentialBody(input),
    });
  },
};

export default credentialCreateIssueSend;
