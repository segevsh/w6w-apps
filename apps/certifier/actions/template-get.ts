import type { ActionDefinition } from "@w6w/types";
import { CertifierClient, encodeId } from "../lib/client.ts";
import { groupIdParam } from "../lib/params.ts";

interface Input {
  groupId: string;
}

const templateGet: ActionDefinition<Input> = {
  key: "template-get",
  type: "read",
  resource: "credential-template",
  title: "Get Credential Template",
  description: "Fetch one credential template (group) with its ordered design IDs.",
  params: [groupIdParam],
  output: [
    { key: "id", type: "string", label: "Template ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "learningEventUrl", type: "string", label: "Learning event URL" },
    { key: "designIds", type: "array", label: "Design IDs" },
  ],

  execute(input, ctx) {
    return new CertifierClient(ctx).json(`/groups/${encodeId(input.groupId)}`);
  },
};

export default templateGet;
