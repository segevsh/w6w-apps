import type { ActionDefinition } from "@w6w/types";
import { compact, fieldsObject, kt } from "../lib/client.ts";

interface Input {
  email?: string;
  smsNumber?: string;
  optinId?: number;
  tagId?: number;
  fields?: unknown;
}

/** Add a contact, or update the one with the same email. Triggers the opt-in process, which may email the contact. */
const subscriberUpsert: ActionDefinition<Input> = {
  key: "subscriber-upsert",
  type: "perform",
  resource: "subscriber",
  title: "Add or Update Contact",
  description:
    "Add a contact, or update the one with the same email. Triggers the opt-in process, which may email the contact.",
  idempotent: true,
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "Either an email or an SMS number is required.",
    },
    {
      key: "smsNumber",
      label: "SMS number",
      type: "string",
      placeholder: "+491701234567",
      hint: "International format. Either an email or an SMS number is required.",
    },
    {
      key: "optinId",
      label: "Opt-in process ID",
      type: "number",
      hint:
        "From List Opt-in Processes. If omitted, the account's predefined double opt-in runs, " +
        "which emails the contact.",
    },
    {
      key: "tagId",
      label: "Tag ID",
      type: "number",
      hint: "A manual tag to assign. From List Tags.",
    },
    {
      key: "fields",
      label: "Data fields",
      type: "json",
      hint: 'Object of data-field key to value, e.g. {"fieldFirstName":"Alex","field12345":"x"}. ' +
        "Keys come from Get Data Fields. Dates and times are Unix seconds.",
    },
  ],
  output: [{ key: "subscriber", type: "object", label: "Contact" }],

  async execute(input, ctx) {
    ctx.log("info", "subscriber-upsert");
    if (!input.email && !input.smsNumber) {
      throw new Error("Either an email or an SMS number is required");
    }
    const subscriber = await kt(ctx, "POST", "/subscriber", {
      body: compact({
        email: input.email,
        smsnumber: input.smsNumber,
        listid: input.optinId,
        tagid: input.tagId,
        fields: fieldsObject(input.fields),
      }),
    });
    return { subscriber };
  },
};

export default subscriberUpsert;
