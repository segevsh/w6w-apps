import type { ActionDefinition } from "@w6w/types";
import { CleverReachClient, compact, optString } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "blacklist-add",
  type: "perform",
  resource: "blacklist",
  title: "Add to the blacklist",
  description: "Add an email address to the blacklist (`POST /v3/blacklist`). Not idempotent.",
  idempotent: false,
  params: [
    { key: "email", label: "Email", type: "string", required: true, default: "" },
    { key: "comment", label: "Comment", type: "string" },
  ],
  output: [
    { key: "result", type: "object", label: "CleverReach's response body" },
  ],

  async execute(input, ctx) {
    const email = optString(input.email);
    if (!email) throw new Error("`email` is required");
    const body = compact({ email, comment: optString(input.comment) });
    return {
      result: await new CleverReachClient(ctx).request("/blacklist", { method: "POST", body }),
    };
  },
};

export default action;
