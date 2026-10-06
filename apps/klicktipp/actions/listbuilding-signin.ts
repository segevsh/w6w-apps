import type { ActionDefinition } from "@w6w/types";
import { compact, fieldsObject, kt } from "../lib/client.ts";

interface Input {
  email?: string;
  smsNumber?: string;
  fields?: unknown;
}

/** Add or update a contact through a Listbuilding API key, applying the key's tag and opt-in process. Needs a Listbuilding API Key connection. */
const listbuildingSignin: ActionDefinition<Input> = {
  key: "listbuilding-signin",
  type: "perform",
  resource: "listbuilding",
  title: "Listbuilding: Sign In Contact",
  description:
    "Add or update a contact through a Listbuilding API key, applying the key's tag and opt-in process. Needs a Listbuilding API Key connection.",
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
      key: "fields",
      label: "Data fields",
      type: "json",
      hint: 'Object of data-field key to value, e.g. {"fieldFirstName":"Alex","field12345":"x"}. ' +
        "Keys come from Get Data Fields. Dates and times are Unix seconds.",
    },
  ],
  output: [{ key: "redirectUrl", type: "string", label: "Pending / thank-you page URL" }],

  async execute(input, ctx) {
    ctx.log("info", "listbuilding-signin");
    if (!input.email && !input.smsNumber) {
      throw new Error("Either an email or an SMS number is required");
    }
    // The API key is merged into this body by the connection's `sign` hook.
    const res = await kt(ctx, "POST", "/subscriber/signin", {
      body: compact({
        email: input.email,
        smsnumber: input.smsNumber,
        fields: fieldsObject(input.fields),
      }),
    });
    return { redirectUrl: Array.isArray(res) ? String(res[0] ?? "") : "" };
  },
};

export default listbuildingSignin;
