import type { ActionDefinition } from "@w6w/types";
import { CertifierClient, encodeId } from "../lib/client.ts";
import { groupIdParam } from "../lib/params.ts";

interface Input {
  groupId: string;
}

const templateDelete: ActionDefinition<Input> = {
  key: "template-delete",
  type: "perform",
  resource: "credential-template",
  title: "Delete Credential Template",
  description: "Permanently delete a credential template (group). This cannot be undone.",
  idempotent: true,
  params: [groupIdParam],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "id", type: "string", label: "Template ID" },
  ],

  async execute(input, ctx) {
    await new CertifierClient(ctx).json(`/groups/${encodeId(input.groupId)}`, {
      method: "DELETE",
    });
    return { deleted: true, id: input.groupId };
  },
};

export default templateDelete;
