import type { ActionDefinition } from "@w6w/types";
import { TypeformClient } from "../lib/client.ts";

interface Input {
  formId: string;
  responseIds: string;
}

/**
 * DELETE /forms/{form_id}/responses — delete specific responses by id. Typeform
 * takes the ids as the `included_response_ids` query parameter (a comma-
 * separated list of up to 1000 ids); this action accepts them the same way.
 */
const responseDelete: ActionDefinition<Input> = {
  key: "response-delete",
  type: "perform",
  resource: "response",
  title: "Delete Responses",
  description: "Delete one or more responses from a form by response id.",
  // Deleting an already-deleted response is a no-op; the end state is identical.
  idempotent: true,
  params: [
    { key: "formId", label: "Form ID", type: "string", required: true },
    {
      key: "responseIds",
      label: "Response IDs",
      type: "string",
      required: true,
      hint: "Comma-separated response ids to delete (up to 1000).",
    },
  ],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    await new TypeformClient(ctx).request(
      `/forms/${encodeURIComponent(input.formId)}/responses`,
      {
        method: "DELETE",
        query: { included_response_ids: input.responseIds },
      },
    );
    return { deleted: true };
  },
};

export default responseDelete;
