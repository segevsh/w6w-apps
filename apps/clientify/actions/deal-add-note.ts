import type { ActionDefinition } from "@w6w/types";
import { ClientifyClient, compact } from "../lib/client.ts";

/**
 * `POST /v1/deals/{dealId}/note/` — Add a note to a deal's wall.
 */
interface Input {
  dealId: string;
  name: string;
  comment: string;
}

const dealAddNote: ActionDefinition<Input, unknown> = {
  key: "deal-add-note",
  type: "perform",
  resource: "note",
  title: "Add Note to Deal",
  description: "Add a note to a deal's wall.",
  idempotent: false,
  params: [
    { key: "dealId", label: "Deal ID", type: "string", required: true },
    { key: "name", label: "Note title", type: "string", required: true },
    { key: "comment", label: "Note text", type: "text", required: true },
  ],
  output: [
    { key: "status", type: "string", label: "`ok` when accepted" },
  ],

  execute(input, ctx) {
    const client = new ClientifyClient(ctx);
    return client.request(`/v1/deals/${encodeURIComponent(input.dealId)}/note/`, {
      method: "POST",
      body: compact({ name: input.name, comment: input.comment }),
    });
  },
};

export default dealAddNote;
