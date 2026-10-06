import type { ActionDefinition } from "@w6w/types";
import { compact, LiveChatClient, optString, requireString } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "update-customer",
  type: "perform",
  idempotent: true,
  resource: "customer",
  title: "Update customer",
  description: "Update a customer's name, email, phone, avatar or session fields " +
    "(`POST /v3.6/agent/action/update_customer`). Needs `customers:rw`. At least one field " +
    "besides the id is required.",
  params: [
    {
      key: "customerId",
      label: "Customer ID",
      type: "string",
      required: true,
      hint: "UUID v4.",
    },
    { key: "name", label: "Name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    {
      key: "phoneNumber",
      label: "Phone number",
      type: "string",
      hint: "E.164, e.g. +14155550123.",
    },
    { key: "avatar", label: "Avatar URL", type: "string" },
    {
      key: "sessionFields",
      label: "Session fields (JSON)",
      type: "json",
      hint:
        'Array of single-key objects, e.g. [{"plan":"pro"},{"region":"eu"}]. Order is preserved. ' +
        "Replaces the existing session fields.",
    },
  ],
  output: [{ key: "updated", type: "boolean", label: "True when LiveChat accepted the call" }],

  async execute(input, ctx) {
    let sessionFields: unknown = input.sessionFields;
    if (typeof sessionFields === "string" && sessionFields.trim() !== "") {
      try {
        sessionFields = JSON.parse(sessionFields);
      } catch {
        throw new Error("`sessionFields` must be valid JSON");
      }
    }
    if (sessionFields === "") sessionFields = undefined;
    if (sessionFields !== undefined && sessionFields !== null && !Array.isArray(sessionFields)) {
      throw new Error("`sessionFields` must be a JSON array of objects");
    }
    const fields = compact({
      name: optString(input.name),
      email: optString(input.email),
      phone_number: optString(input.phoneNumber),
      avatar: optString(input.avatar),
      session_fields: sessionFields,
    });
    if (Object.keys(fields).length === 0) {
      throw new Error("provide at least one of name, email, phoneNumber, avatar, sessionFields");
    }
    await new LiveChatClient(ctx).agent("update_customer", {
      id: requireString(input.customerId, "customerId"),
      ...fields,
    });
    return { updated: true };
  },
};

export default action;
