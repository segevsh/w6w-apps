import type { ActionDefinition } from "@w6w/types";
import { compact, expectTrue, fieldsObject, kt, seg } from "../lib/client.ts";

interface Input {
  subscriberId: string;
  newEmail?: string;
  newSmsNumber?: string;
  fields?: unknown;
}

/** Change a contact's email, SMS number or data fields. */
const subscriberUpdate: ActionDefinition<Input> = {
  key: "subscriber-update",
  type: "perform",
  resource: "subscriber",
  title: "Update Contact",
  description: "Change a contact's email, SMS number or data fields.",
  idempotent: true,
  params: [
    {
      key: "subscriberId",
      label: "Contact ID or key",
      type: "string",
      required: true,
    },
    { key: "newEmail", label: "New email", type: "string" },
    { key: "newSmsNumber", label: "New SMS number", type: "string", placeholder: "+491701234567" },
    {
      key: "fields",
      label: "Data fields",
      type: "json",
      hint: 'Object of data-field key to value, e.g. {"fieldFirstName":"Alex","field12345":"x"}. ' +
        "Keys come from Get Data Fields. Dates and times are Unix seconds.",
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Updated" }],

  async execute(input, ctx) {
    ctx.log("info", "subscriber-update");
    const body = compact({
      newemail: input.newEmail,
      newsmsnumber: input.newSmsNumber,
      fields: fieldsObject(input.fields),
    });
    if (Object.keys(body).length === 0) {
      throw new Error("Give a new email, a new SMS number or at least one data field");
    }
    const res = await kt(ctx, "PUT", `/subscriber/${seg(input.subscriberId, "subscriberId")}`, {
      body,
    });
    return { success: expectTrue(res, "update") };
  },
};

export default subscriberUpdate;
