import type { ActionDefinition } from "@w6w/types";
import { FlodeskClient } from "../lib/client.ts";

interface Input {
  workflowId: string;
  email?: string;
  id?: string;
}

/**
 * `POST /v1/workflows/{workflow_id}/subscribers` — enrol a subscriber into an
 * automation. Answers `204` with no body.
 *
 * **`idempotent: false`, and this is the deliberate call.** Every other
 * membership write in this app converges (segments are a set), but entering a
 * workflow is an EVENT, not a state: a workflow is a timed sequence of emails,
 * so a retry can plausibly re-enter the subscriber and send the sequence twice.
 * Flodesk documents no dedupe, no "already enrolled" response and no
 * idempotency key, so there is nothing to justify claiming a safe retry. Where
 * the vendor is silent and the failure mode is "your customer got the same
 * five emails again", the honest answer is `false`.
 *
 * Unlike the other subscriber endpoints this one takes the subscriber in the
 * BODY (`id` or `email`), not the path — only `workflow_id` is a path segment.
 */
const addSubscriberToWorkflow: ActionDefinition<Input> = {
  key: "add-subscriber-to-workflow",
  type: "perform",
  resource: "workflow",
  title: "Add Subscriber to Workflow",
  description:
    "Enrol a subscriber into a workflow by email or id. Not marked idempotent: Flodesk documents no dedupe, so a retry may re-enter the subscriber and resend the sequence.",
  idempotent: false,
  params: [
    { key: "workflowId", label: "Workflow ID", type: "string", required: true },
    {
      key: "email",
      label: "Email",
      type: "string",
      placeholder: "name@email.com",
      row: "identity",
      hint: "Required if `id` is not given.",
    },
    {
      key: "id",
      label: "Subscriber ID",
      type: "string",
      row: "identity",
      hint: "Required if `email` is not given.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success)" }],

  async execute(input, ctx) {
    if (!input.email && !input.id) {
      throw new Error("Flodesk requires either `email` or `id` to identify the subscriber");
    }

    const body: Record<string, unknown> = {};
    if (input.id !== undefined) body.id = input.id;
    if (input.email !== undefined) body.email = input.email;

    // 204 No Content — there is no body to return, so report the status.
    const res = await new FlodeskClient(ctx).send(
      `/workflows/${FlodeskClient.seg(input.workflowId)}/subscribers`,
      { method: "POST", body },
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Flodesk ${res.status} ${res.statusText} for POST /workflows/${input.workflowId}/subscribers: ${detail}`,
      );
    }
    return { status: res.status };
  },
};

export default addSubscriberToWorkflow;
