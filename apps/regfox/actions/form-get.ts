import type { ActionDefinition } from "@w6w/types";
import { encodeId, RegfoxClient } from "../lib/client.ts";
import { requiredId } from "../lib/params.ts";

/** `GET /v2/public/forms/{id}` */
const formGet: ActionDefinition<Record<string, unknown>> = {
  key: "form-get",
  type: "read",
  resource: "form",
  title: "Get Form",
  description: "Get one registration form by id, optionally with its inventory.",
  params: [
    requiredId("formId", "Form ID"),
    { key: "inventory", label: "Include inventory", type: "boolean", default: false },
  ],
  output: [{ key: "form", type: "object", label: "The form" }],
  async execute(input, ctx) {
    const body = await new RegfoxClient(ctx).call(`/forms/${encodeId(input.formId)}`, {
      query: { "[]expand": input.inventory ? "inventory" : undefined },
    });
    return { form: body.data };
  },
};

export default formGet;
