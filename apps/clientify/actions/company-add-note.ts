import type { ActionDefinition } from "@w6w/types";
import { ClientifyClient, compact } from "../lib/client.ts";

/**
 * `POST /v1/companies/{companyId}/note/` — Add a note to a company's wall.
 */
interface Input {
  companyId: string;
  name: string;
  comment: string;
}

const companyAddNote: ActionDefinition<Input, unknown> = {
  key: "company-add-note",
  type: "perform",
  resource: "note",
  title: "Add Note to Company",
  description: "Add a note to a company's wall.",
  idempotent: false,
  params: [
    { key: "companyId", label: "Company ID", type: "string", required: true },
    { key: "name", label: "Note title", type: "string", required: true },
    { key: "comment", label: "Note text", type: "text", required: true },
  ],
  output: [
    { key: "status", type: "string", label: "`ok` when accepted" },
  ],

  execute(input, ctx) {
    const client = new ClientifyClient(ctx);
    return client.request(`/v1/companies/${encodeURIComponent(input.companyId)}/note/`, {
      method: "POST",
      body: compact({ name: input.name, comment: input.comment }),
    });
  },
};

export default companyAddNote;
