import type { ActionDefinition } from "@w6w/types";
import { kt } from "../lib/client.ts";

interface Input {
  listId: number;
  email: string;
}

/** Look up the redirect URL of an opt-in process for a given contact email. */
const optinRedirect: ActionDefinition<Input> = {
  key: "optin-redirect",
  type: "read",
  resource: "optin",
  title: "Find Opt-in Redirect URL",
  description: "Look up the redirect URL of an opt-in process for a given contact email.",
  params: [
    {
      key: "listId",
      label: "Opt-in process ID",
      type: "number",
      required: true,
      validation: { min: 1, integer: true },
    },
    { key: "email", label: "Email", type: "string", required: true },
  ],
  output: [
    { key: "urls", type: "array", label: "Redirect URLs" },
    { key: "url", type: "string", label: "First redirect URL (null when none)" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "optin-redirect");
    const res = await kt(ctx, "POST", "/list/redirect", {
      body: { listid: String(input.listId), email: input.email },
    });
    const urls = Array.isArray(res) ? res.map(String) : [];
    return { urls, url: urls[0] ?? null };
  },
};

export default optinRedirect;
