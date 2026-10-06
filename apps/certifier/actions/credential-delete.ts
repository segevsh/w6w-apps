import type { ActionDefinition } from "@w6w/types";
import { CertifierClient, encodeId } from "../lib/client.ts";
import { credentialIdParam } from "../lib/params.ts";

interface Input {
  credentialId: string;
}

const credentialDelete: ActionDefinition<Input> = {
  key: "credential-delete",
  type: "perform",
  resource: "credential",
  title: "Delete Credential",
  description: "Permanently delete a credential. This cannot be undone.",
  // A second delete answers 404, so a retry cannot double-delete.
  idempotent: true,
  params: [credentialIdParam],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "id", type: "string", label: "Credential ID" },
  ],

  async execute(input, ctx) {
    await new CertifierClient(ctx).json(`/credentials/${encodeId(input.credentialId)}`, {
      method: "DELETE",
    });
    return { deleted: true, id: input.credentialId };
  },
};

export default credentialDelete;
