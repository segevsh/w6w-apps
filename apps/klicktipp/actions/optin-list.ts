import type { ActionDefinition } from "@w6w/types";
import { kt } from "../lib/client.ts";

interface Input {
  detail?: boolean;
}

/** List the ID and name of every opt-in process. The unnamed entry is the default double opt-in. */
const optinList: ActionDefinition<Input> = {
  key: "optin-list",
  type: "read",
  resource: "optin",
  title: "List Opt-in Processes",
  description:
    "List the ID and name of every opt-in process. The unnamed entry is the default double opt-in.",
  params: [
    {
      key: "detail",
      label: "Include URLs",
      type: "boolean",
      default: false,
      hint: "Adds the pending-page and thank-you-page URL of each process.",
    },
  ],
  output: [{
    key: "optins",
    type: "array",
    label: "Processes: { id, name, pendingUrl?, thankYouUrl? }",
  }],

  async execute(input, ctx) {
    ctx.log("info", "optin-list");
    const map = await kt(ctx, "GET", "/list", {
      query: { detail: input.detail ? "true" : undefined },
    }) as Record<string, string | { name?: string; pendingurl?: string; thankyouurl?: string }>;
    const optins = Object.entries(map).map(([id, v]) =>
      typeof v === "string" ? { id, name: v } : {
        id,
        name: v.name ?? "",
        pendingUrl: v.pendingurl,
        thankYouUrl: v.thankyouurl,
      }
    );
    return { optins };
  },
};

export default optinList;
