import type { ActionDefinition } from "@w6w/types";
import { RecallClient, seg } from "../lib/client.ts";
import { DELETED_OUTPUT, idParam } from "../lib/params.ts";

interface Input {
  id: string;
}

/** `DELETE /api/v1/transcript/{id}/` — answers 204 with no body. */
const action: ActionDefinition<Input> = {
  key: "transcript-delete",
  type: "perform",
  resource: "transcript",
  title: "Delete Transcript",
  description: "Delete a transcript. Irreversible.",
  idempotent: true,
  params: [idParam("Transcript ID")],
  output: DELETED_OUTPUT,

  async execute(input, ctx) {
    await new RecallClient(ctx).request("DELETE", `/api/v1/transcript/${seg(input.id)}/`);
    return { deleted: true, id: input.id };
  },
};

export default action;
