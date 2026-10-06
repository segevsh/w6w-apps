import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, GoCanvasClient } from "../lib/client.ts";
import { eventParam, idParam } from "../lib/params.ts";

interface Input {
  formId: number;
  webhookId: number;
  eventType?: string;
  format?: string;
  pushUrl?: string;
  pushTag?: string;
}

const webhookUpdate: ActionDefinition<Input> = {
  key: "webhook-update",
  type: "perform",
  resource: "webhook",
  title: "Update Webhook",
  description: "Change a webhook's event, format, URL or tag. Only the fields you set are sent.",
  idempotent: true,
  params: [
    idParam("formId", "Form ID"),
    idParam("webhookId", "Webhook ID"),
    eventParam(false),
    {
      key: "format",
      label: "Payload format",
      type: "select",
      options: [{ value: "json", label: "json" }, { value: "xml", label: "xml" }],
    },
    { key: "pushUrl", label: "Push URL", type: "string" },
    { key: "pushTag", label: "Tag", type: "string" },
  ],
  output: [
    { key: "data", type: "object", label: "The API's confirmation message" },
  ],

  execute(input, ctx) {
    return new GoCanvasClient(ctx).request(
      `/forms/${encodeId(input.formId)}/webhooks/${encodeId(input.webhookId)}`,
      {
        method: "PATCH",
        body: compact({
          event_type: input.eventType,
          format: input.format,
          push_url: input.pushUrl,
          push_tag: input.pushTag,
        }),
      },
    );
  },
};

export default webhookUpdate;
