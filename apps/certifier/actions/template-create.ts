import type { ActionDefinition } from "@w6w/types";
import { CertifierClient, compact, toList } from "../lib/client.ts";
import { designIdsParam, learningEventUrlParam } from "../lib/params.ts";

interface Input {
  name: string;
  designIds: string[] | string;
  learningEventUrl?: string;
}

const templateCreate: ActionDefinition<Input> = {
  key: "template-create",
  type: "perform",
  resource: "credential-template",
  title: "Create Credential Template",
  description: "Create a credential template (group) from one or more certificate/badge designs.",
  // No idempotency key: a retry creates a second template with the same name.
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { ...designIdsParam, required: true },
    learningEventUrlParam,
  ],
  output: [
    { key: "id", type: "string", label: "Template ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "designIds", type: "array", label: "Design IDs" },
  ],

  execute(input, ctx) {
    if (!input.name?.trim()) throw new Error("name is required");
    const designIds = toList(input.designIds);
    if (designIds.length === 0) throw new Error("designIds needs at least one design ID");
    return new CertifierClient(ctx).json("/groups", {
      method: "POST",
      body: compact({
        name: input.name.trim(),
        designIds,
        learningEventUrl: input.learningEventUrl?.trim(),
      }),
    });
  },
};

export default templateCreate;
