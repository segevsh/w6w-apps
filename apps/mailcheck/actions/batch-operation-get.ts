import type { ActionDefinition } from "@w6w/types";
import { MailcheckClient } from "../lib/client.ts";

interface Input {
  operationName: string;
}

/**
 * `GET /v1/emails/{operation_name}` — read a batch check operation's status
 * and, once `done`, its result. Source: https://app.mailcheck.co/openapi.json
 * (`paths["/v1/emails/{operation_name}"]`, `operationId: "getOperation"`).
 */
const batchOperationGet: ActionDefinition<Input> = {
  key: "batch-operation-get",
  type: "read",
  resource: "batch",
  title: "Get Batch Operation",
  description: "Read the status (and result, once finished) of a batch check operation.",
  params: [
    {
      key: "operationName",
      label: "Operation Name",
      type: "string",
      required: true,
      hint: "The `name` returned by Create Batch Check or List Batch Operations.",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Operation name" },
    { key: "done", type: "boolean", label: "Whether the operation finished" },
    { key: "metadata", type: "object", label: "Progress metadata" },
    { key: "result", type: "object", label: "Result, once done" },
  ],

  execute(input, ctx) {
    const client = new MailcheckClient(ctx);
    return client.request(`/v1/emails/${encodeURIComponent(input.operationName)}`);
  },
};

export default batchOperationGet;
