import type { ActionDefinition } from "@w6w/types";
import { EnrichLayerClient } from "../lib/client.ts";

interface Input {
  email: string;
}

/** `GET /disposable-email` */
const disposableEmailCheck: ActionDefinition<Input> = {
  key: "disposable-email-check",
  type: "read",
  resource: "contact",
  title: "Check Disposable Email",
  description:
    "Check whether an email address belongs to a disposable or free email service (free).",
  params: [
    { key: "email", label: "Email address", type: "string", required: true },
  ],
  output: [
    { key: "isDisposableEmail", type: "boolean", label: "Disposable address" },
    { key: "isFreeEmail", type: "boolean", label: "Free-mail address" },
  ],

  async execute(input, ctx) {
    const res = await new EnrichLayerClient(ctx).get("/disposable-email", {
      email: input.email,
    });
    return {
      isDisposableEmail: (res as { is_disposable_email?: boolean }).is_disposable_email ?? null,
      isFreeEmail: (res as { is_free_email?: boolean }).is_free_email ?? null,
    };
  },
};

export default disposableEmailCheck;
