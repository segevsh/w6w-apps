import type { ActionDefinition } from "@w6w/types";
import { encodeId, ESignaturesClient } from "../lib/client.ts";
import { templateIdParam } from "../lib/params.ts";

/** `POST /api/templates/{id}/collaborators/{collaboratorId}/remove` */
interface Input {
  templateId: string;
  collaboratorId: string;
}

const collaboratorRemove: ActionDefinition<Input> = {
  key: "collaborator-remove",
  type: "perform",
  resource: "collaborator",
  title: "Remove Template Collaborator",
  description: "Revoke a collaborator's permission to edit a template.",
  idempotent: false,
  params: [
    templateIdParam,
    {
      key: "collaboratorId",
      label: "Collaborator ID",
      type: "string",
      required: true,
      hint: "The template_collaborator_id from Add / List Template Collaborators.",
    },
  ],
  output: [{ key: "status", type: "string", label: "removed" }],

  execute(input, ctx) {
    return new ESignaturesClient(ctx).status(
      `/templates/${encodeId(input.templateId)}/collaborators/${
        encodeId(input.collaboratorId)
      }/remove`,
      { method: "POST" },
    );
  },
};

export default collaboratorRemove;
