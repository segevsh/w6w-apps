import type { ActionDefinition } from "@w6w/types";
import { encodeId, GoCanvasClient } from "../lib/client.ts";
import { idParam, pageParam } from "../lib/params.ts";

interface Input {
  formId: number;
  page?: number;
}

const webhookList: ActionDefinition<Input> = {
  key: "webhook-list",
  type: "read",
  resource: "webhook",
  title: "List Webhooks",
  description: "List the webhooks configured on a form.",
  params: [
    idParam("formId", "Form ID"),
    pageParam,
  ],
  output: [
    { key: "items", type: "array", label: "Webhooks on this page" },
    { key: "pagination", type: "object", label: "Paging headers" },
  ],

  execute(input, ctx) {
    return new GoCanvasClient(ctx).list(`/forms/${encodeId(input.formId)}/webhooks`, {
      page: input.page,
    });
  },
};

export default webhookList;
