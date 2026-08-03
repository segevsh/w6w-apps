import type { ActionDefinition } from "@w6w/types";
import { MailerLiteClient, type MailerLiteEnvelope } from "../lib/client.ts";

interface Input {
  name: string;
}

/**
 * `POST /api/groups` — `name` is the only field. MailerLite does not dedupe on
 * name, so calling this twice creates two groups: not idempotent.
 */
const createGroup: ActionDefinition<Input> = {
  key: "create-group",
  type: "perform",
  resource: "group",
  title: "Create Group",
  description: "Create a subscriber group.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      validation: { maxLength: 255 },
    },
  ],
  output: [{ key: "data", type: "object", label: "Group" }],

  execute(input, ctx) {
    const client = new MailerLiteClient(ctx);
    return client.request<MailerLiteEnvelope>("/groups", {
      method: "POST",
      body: { name: input.name },
    });
  },
};

export default createGroup;
