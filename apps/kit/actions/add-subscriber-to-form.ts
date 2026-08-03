import type { ActionDefinition } from "@w6w/types";
import { KitClient } from "../lib/client.ts";

interface Input {
  formId: number;
  emailAddress: string;
  referrer?: string;
}

const addSubscriberToForm: ActionDefinition<Input> = {
  key: "add-subscriber-to-form",
  type: "perform",
  resource: "form",
  title: "Add Subscriber To Form",
  description:
    "Add an existing subscriber to a form by email address. Kit requires the subscriber to exist already — create them with Create Subscriber first, or this returns 404.",
  idempotent: true,
  params: [
    { key: "formId", label: "Form ID", type: "number", required: true },
    {
      key: "emailAddress",
      label: "Email address",
      type: "string",
      required: true,
      placeholder: "name@email.com",
    },
    {
      key: "referrer",
      label: "Referrer",
      type: "string",
      hint: "Optional URL recorded as the subscription's attribution referrer.",
    },
  ],
  output: [{ key: "subscriber", type: "object", label: "Subscriber" }],

  execute(input, ctx) {
    const body: Record<string, unknown> = { email_address: input.emailAddress };
    if (input.referrer !== undefined) body.referrer = input.referrer;
    return new KitClient(ctx).request(`/forms/${input.formId}/subscribers`, {
      method: "POST",
      body,
    });
  },
};

export default addSubscriberToForm;
