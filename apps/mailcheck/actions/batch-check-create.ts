import type { ActionDefinition } from "@w6w/types";
import { MailcheckClient } from "../lib/client.ts";

interface Input {
  emails: string[];
}

/**
 * `POST /v1/emails:check` — create an asynchronous batch check operation over
 * a list of addresses. Source: https://app.mailcheck.co/openapi.json
 * (`paths["/v1/emails:check"]`, `operationId: "createOperation"`).
 *
 * `perform`, not `read`: each call starts a new, billable batch job — it is
 * not safe to retry blindly, so `idempotent: false`. Poll the returned
 * operation `name` with "Get Batch Operation" (or list them with
 * "List Batch Operations") until `done` is `true`.
 */
const batchCheckCreate: ActionDefinition<Input> = {
  key: "batch-check-create",
  type: "perform",
  resource: "batch",
  title: "Create Batch Check",
  description: "Start an asynchronous check of many email addresses at once.",
  idempotent: false,
  params: [
    {
      key: "emails",
      label: "Emails",
      type: "string",
      repeat: true,
      required: true,
      hint: "The addresses to check.",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Operation name" },
    { key: "done", type: "boolean", label: "Whether the operation finished immediately" },
    { key: "metadata", type: "object", label: "Progress metadata" },
    { key: "result", type: "object", label: "Result, once done" },
  ],

  execute(input, ctx) {
    const client = new MailcheckClient(ctx);
    return client.request("/v1/emails:check", { method: "POST", body: { emails: input.emails } });
  },
};

export default batchCheckCreate;
