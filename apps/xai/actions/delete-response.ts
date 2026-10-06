import type { ActionDefinition } from "@w6w/types";
import { XaiClient } from "../lib/client.ts";

interface Input {
  responseId: string;
}

/** DELETE /v1/responses/{response_id}. */
const deleteResponse: ActionDefinition<Input> = {
  key: "delete-response",
  type: "perform",
  resource: "response",
  title: "Delete Response",
  description: "Delete a stored response (DELETE /v1/responses/{id}).",
  idempotent: true,
  params: [{ key: "responseId", label: "Response ID", type: "string", required: true }],
  output: [{ key: "id", type: "string", label: "Response id" }],

  execute(input, ctx) {
    return new XaiClient(ctx).request(`/v1/responses/${encodeURIComponent(input.responseId)}`, {
      method: "DELETE",
    });
  },
};

export default deleteResponse;
