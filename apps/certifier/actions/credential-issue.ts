import type { ActionDefinition } from "@w6w/types";
import { CertifierClient, encodeId } from "../lib/client.ts";
import { credentialIdParam } from "../lib/params.ts";

interface Input {
  credentialId: string;
}

const credentialIssue: ActionDefinition<Input> = {
  key: "credential-issue",
  type: "perform",
  resource: "credential",
  title: "Issue Credential",
  description: "Move a `draft` credential to `issued`. Only drafts can be issued.",
  // Issuing an already-issued credential is refused rather than repeated.
  idempotent: true,
  params: [credentialIdParam],
  output: [
    { key: "id", type: "string", label: "Credential ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    return new CertifierClient(ctx).json(`/credentials/${encodeId(input.credentialId)}/issue`, {
      method: "POST",
    });
  },
};

export default credentialIssue;
