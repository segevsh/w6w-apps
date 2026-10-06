import type { ActionDefinition } from "@w6w/types";
import { XaiClient } from "../lib/client.ts";

interface Input {
  responseId: string;
}

/** GET /v1/responses/{response_id} — retrieve a stored response. */
const getResponse: ActionDefinition<Input> = {
  key: "get-response",
  type: "read",
  resource: "response",
  title: "Get Response",
  description: "Retrieve a previously stored response by id (GET /v1/responses/{id}).",
  params: [{ key: "responseId", label: "Response ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Response id" },
    { key: "output", type: "array", label: "Output items" },
  ],

  execute(input, ctx) {
    return new XaiClient(ctx).request(`/v1/responses/${encodeURIComponent(input.responseId)}`);
  },
};

export default getResponse;
