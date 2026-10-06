import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, GoCanvasClient } from "../lib/client.ts";
import { eventParam, idParam } from "../lib/params.ts";

interface Input {
  formId: number;
  eventType: string;
  format: string;
  pushUrl: string;
  pushTag?: string;
}

const webhookCreate: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description:
    "Subscribe a URL to a form event. dispatch_create needs Dispatch enabled on the form, workflow_handoff_create needs Workflow, submission_custom_status_change needs Submission Status. xml is only valid for submission_create.",
  idempotent: false,
  params: [
    idParam("formId", "Form ID"),
    eventParam(true),
    {
      key: "format",
      label: "Payload format",
      type: "select",
      required: true,
      options: [{ value: "json", label: "json" }, { value: "xml", label: "xml" }],
      hint: "xml is only valid for submission_create.",
    },
    {
      key: "pushUrl",
      label: "Push URL",
      type: "string",
      required: true,
      hint: "The endpoint GoCanvas will POST to.",
    },
    { key: "pushTag", label: "Tag", type: "string", hint: "A label of your own." },
  ],
  output: [
    { key: "data", type: "object", label: "The created webhook" },
  ],

  execute(input, ctx) {
    return new GoCanvasClient(ctx).request(`/forms/${encodeId(input.formId)}/webhooks`, {
      method: "POST",
      body: compact({
        event_type: input.eventType,
        format: input.format,
        push_url: input.pushUrl,
        push_tag: input.pushTag,
      }),
    });
  },
};

export default webhookCreate;
