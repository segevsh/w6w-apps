import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, ESignaturesClient } from "../lib/client.ts";
import { templateIdParam } from "../lib/params.ts";

/**
 * `POST /api/templates/{id}/collaborators` — add someone who can edit the template. An invitation
 * email is sent only when `email` is given; otherwise use the returned editor URL (embeddable
 * with `embedded=yes`). `data` is an array with one collaborator.
 */
interface Input {
  templateId: string;
  name?: string;
  email?: string;
}

const collaboratorAdd: ActionDefinition<Input> = {
  key: "collaborator-add",
  type: "perform",
  resource: "collaborator",
  title: "Add Template Collaborator",
  description: "Add a collaborator who can edit a template; returns their editor URL.",
  idempotent: false,
  params: [
    templateIdParam,
    { key: "name", label: "Name", type: "string" },
    { key: "email", label: "Email", type: "string", hint: "An invitation is emailed when set." },
  ],
  output: [
    { key: "collaborator", type: "object", label: "The collaborator, with its editor URL" },
  ],

  async execute(input, ctx) {
    const data = await new ESignaturesClient(ctx).data(
      `/templates/${encodeId(input.templateId)}/collaborators`,
      { method: "POST", body: compact({ name: input.name, email: input.email }) },
    );
    return { collaborator: Array.isArray(data) ? data[0] : data };
  },
};

export default collaboratorAdd;
