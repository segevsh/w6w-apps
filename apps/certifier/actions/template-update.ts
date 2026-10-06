import type { ActionDefinition } from "@w6w/types";
import { CertifierClient, compact, encodeId, toList } from "../lib/client.ts";
import { designIdsParam, groupIdParam, learningEventUrlParam } from "../lib/params.ts";

interface Input {
  groupId: string;
  name?: string;
  designIds?: string[] | string;
  learningEventUrl?: string;
}

const templateUpdate: ActionDefinition<Input> = {
  key: "template-update",
  type: "perform",
  resource: "credential-template",
  title: "Update Credential Template",
  description:
    "Change a credential template's name, designs or learning-event link. Fields you leave " +
    "empty are unchanged; Design IDs, when set, REPLACES the whole ordered list.",
  idempotent: true,
  params: [
    groupIdParam,
    { key: "name", label: "Name", type: "string" },
    designIdsParam,
    learningEventUrlParam,
  ],
  output: [
    { key: "id", type: "string", label: "Template ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "designIds", type: "array", label: "Design IDs" },
  ],

  execute(input, ctx) {
    const designIds = toList(input.designIds);
    const body = compact({
      name: input.name?.trim(),
      designIds: designIds.length > 0 ? designIds : undefined,
      learningEventUrl: input.learningEventUrl?.trim(),
    });
    if (Object.keys(body).length === 0) {
      throw new Error("nothing to update: set at least one field");
    }
    return new CertifierClient(ctx).json(`/groups/${encodeId(input.groupId)}`, {
      method: "PATCH",
      body,
    });
  },
};

export default templateUpdate;
