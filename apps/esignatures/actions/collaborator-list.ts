import type { ActionDefinition } from "@w6w/types";
import { encodeId, ESignaturesClient } from "../lib/client.ts";
import { templateIdParam } from "../lib/params.ts";

/** `GET /api/templates/{id}/collaborators` */
interface Input {
  templateId: string;
}

const collaboratorList: ActionDefinition<Input> = {
  key: "collaborator-list",
  type: "read",
  resource: "collaborator",
  title: "List Template Collaborators",
  description: "List the collaborators who can edit a template.",
  params: [templateIdParam],
  output: [{ key: "collaborators", type: "array", label: "Collaborators" }],

  async execute(input, ctx) {
    const data = await new ESignaturesClient(ctx).data(
      `/templates/${encodeId(input.templateId)}/collaborators`,
    );
    return { collaborators: Array.isArray(data) ? data : [] };
  },
};

export default collaboratorList;
