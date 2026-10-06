import type { ActionDefinition } from "@w6w/types";
import { RecallClient, seg } from "../lib/client.ts";
import { DELETED_OUTPUT, idParam } from "../lib/params.ts";

interface Input {
  id: string;
}

/** `DELETE /api/v1/recording/{id}/` — answers 204 with no body. */
const action: ActionDefinition<Input> = {
  key: "recording-delete",
  type: "perform",
  resource: "recording",
  title: "Delete Recording",
  description: "Delete a recording and its media. Irreversible.",
  idempotent: true,
  params: [idParam("Recording ID")],
  output: DELETED_OUTPUT,

  async execute(input, ctx) {
    await new RecallClient(ctx).request("DELETE", `/api/v1/recording/${seg(input.id)}/`);
    return { deleted: true, id: input.id };
  },
};

export default action;
