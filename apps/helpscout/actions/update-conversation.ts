import type { ActionDefinition } from "@w6w/types";
import { HelpScoutClient } from "../lib/client.ts";

interface Input {
  conversationId: number;
  field: string;
  value?: string;
}

interface FieldOp {
  path: string;
  op: "replace" | "move" | "remove";
}

/**
 * Help Scout's Update Conversation endpoint is a JSON-Patch call that takes
 * exactly ONE `{ op, path, value }` operation per request — not the array
 * form its own Update Customer endpoint takes. `field` picks one of the six
 * `path`/`op` pairs the API documents as valid; `execute` fills in `op` and
 * coerces `value` to the type that path expects, since the API rejects a
 * string where it wants a number or boolean.
 */
const FIELD_OPS: Record<string, FieldOp> = {
  subject: { path: "/subject", op: "replace" },
  status: { path: "/status", op: "replace" },
  assignTo: { path: "/assignTo", op: "replace" },
  unassign: { path: "/assignTo", op: "remove" },
  mailboxId: { path: "/mailboxId", op: "move" },
  customerId: { path: "/primaryCustomer.id", op: "replace" },
  publishDraft: { path: "/draft", op: "replace" },
};

/** Paths whose `value` Help Scout expects as a number rather than a string. */
const NUMERIC_FIELDS = new Set(["assignTo", "mailboxId", "customerId"]);

const updateConversation: ActionDefinition<Input> = {
  key: "update-conversation",
  type: "perform",
  resource: "conversation",
  title: "Update Conversation",
  description: "Change one field on a conversation: subject, status, owner, inbox or customer.",
  idempotent: true,
  params: [
    { key: "conversationId", label: "Conversation ID", type: "number", required: true },
    {
      key: "field",
      label: "Field to change",
      type: "select",
      required: true,
      options: [
        { value: "subject", label: "Subject" },
        { value: "status", label: "Status (active / closed / pending)" },
        { value: "assignTo", label: "Owner (assign to user ID)" },
        { value: "unassign", label: "Unassign" },
        { value: "mailboxId", label: "Move to inbox (ID)" },
        { value: "customerId", label: "Change customer (ID)" },
        { value: "publishDraft", label: "Publish draft" },
      ],
    },
    {
      key: "value",
      label: "Value",
      type: "string",
      hint: "New subject text, a status value, or the numeric ID — depending on the field above. " +
        "Not needed for Unassign or Publish draft.",
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Updated" }],

  async execute(input, ctx) {
    const mapping = FIELD_OPS[input.field];
    if (!mapping) throw new Error(`unknown field "${input.field}"`);

    let value: string | number | boolean | undefined;
    if (mapping.op === "remove") {
      value = undefined;
    } else if (input.field === "publishDraft") {
      value = true;
    } else if (NUMERIC_FIELDS.has(input.field)) {
      value = Number(input.value);
    } else {
      value = input.value;
    }

    // Help Scout answers 204 No Content — nothing to hand back beyond confirmation.
    await new HelpScoutClient(ctx).request(`/conversations/${input.conversationId}`, {
      method: "PATCH",
      body: { op: mapping.op, path: mapping.path, value },
    });
    return { success: true };
  },
};

export default updateConversation;
