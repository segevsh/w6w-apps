import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  email: string;
}

const FIELDS: readonly Field[] = [
  ["email", "email", "s"],
];

const emailValidate: ActionDefinition<Input, ActionResult> = {
  key: "email-validate",
  type: "read",
  resource: "enrich",
  title: "Validate Email",
  description: "Check whether an email address is valid and deliverable.",
  params: [
    { key: "email", label: "Email", type: "string", required: true },
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).act(
      "enrich",
      "validate_email",
      undefined,
      mapInput(input, FIELDS),
    );
  },
};

export default emailValidate;
