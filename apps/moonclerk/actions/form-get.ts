import type { ActionDefinition } from "@w6w/types";
import { MoonClerkClient, seg } from "../lib/client.ts";

interface Input {
  formId: number;
}

/** `GET /forms/:id` — one payment form, wrapped as `{ "form": {...} }`. */
const formGet: ActionDefinition<Input> = {
  key: "form-get",
  type: "read",
  resource: "form",
  title: "Get Form",
  description: "Fetch one payment form by its MoonClerk ID.",
  params: [
    {
      key: "formId",
      label: "Form ID",
      type: "number",
      required: true,
      hint: "From List Forms.",
      validation: { integer: true },
    },
  ],
  output: [{ key: "form", type: "object", label: "Form" }],

  async execute(input, ctx) {
    return { form: await new MoonClerkClient(ctx).one(`/forms/${seg(input.formId)}`, "form") };
  },
};

export default formGet;
