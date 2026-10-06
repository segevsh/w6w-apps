import type { ActionDefinition } from "@w6w/types";
import { CertifierClient, encodeId } from "../lib/client.ts";
import { credentialIdParam } from "../lib/params.ts";

interface Input {
  credentialId: string;
}

const credentialGet: ActionDefinition<Input> = {
  key: "credential-get",
  type: "read",
  resource: "credential",
  title: "Get Credential",
  description: "Fetch one credential: status, recipient, dates, and custom attributes.",
  params: [credentialIdParam],
  output: [
    { key: "id", type: "string", label: "Credential ID" },
    { key: "publicId", type: "string", label: "Public ID" },
    { key: "groupId", type: "string", label: "Credential template ID" },
    { key: "status", type: "string", label: "Status (draft, scheduled, issued, expired)" },
    { key: "recipient", type: "object", label: "Recipient" },
    { key: "issueDate", type: "string", label: "Issue date" },
    { key: "expiryDate", type: "string", label: "Expiry date" },
  ],

  execute(input, ctx) {
    return new CertifierClient(ctx).json(`/credentials/${encodeId(input.credentialId)}`);
  },
};

export default credentialGet;
