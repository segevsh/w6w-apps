import type { ActionDefinition } from "@w6w/types";
import { FlodeskClient } from "../lib/client.ts";

interface Input {
  workflowId: string;
  idOrEmail: string;
}

/**
 * `DELETE /v1/workflows/{workflow_id}/subscribers/{id_or_email}` — take a
 * subscriber out of an automation. Answers `204` with no body.
 *
 * `idempotent: true`, unlike its counterpart: removal converges. Removing a
 * subscriber who is not enrolled leaves them not enrolled, and there is no
 * "send again" failure mode to guard against.
 *
 * Note the asymmetry with Add Subscriber to Workflow, which takes the
 * subscriber in the body — here it is a second PATH segment.
 */
const removeSubscriberFromWorkflow: ActionDefinition<Input> = {
  key: "remove-subscriber-from-workflow",
  type: "perform",
  resource: "workflow",
  title: "Remove Subscriber from Workflow",
  description:
    "Remove a subscriber from a workflow by id or email, halting the remaining steps of that automation for them.",
  idempotent: true,
  params: [
    { key: "workflowId", label: "Workflow ID", type: "string", required: true },
    {
      key: "idOrEmail",
      label: "Subscriber ID or email",
      type: "string",
      required: true,
      placeholder: "name@email.com",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success)" }],

  async execute(input, ctx) {
    const path = `/workflows/${FlodeskClient.seg(input.workflowId)}/subscribers/${
      FlodeskClient.seg(input.idOrEmail)
    }`;
    const res = await new FlodeskClient(ctx).send(path, { method: "DELETE" });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Flodesk ${res.status} ${res.statusText} for DELETE ${path}: ${detail}`);
    }
    return { status: res.status };
  },
};

export default removeSubscriberFromWorkflow;
