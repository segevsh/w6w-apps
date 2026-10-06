import type { ActionDefinition } from "@w6w/types";
import { CleverReachClient, compact, optString } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "group-create",
  type: "perform",
  resource: "group",
  title: "Create a group",
  description:
    "Create a group (receiver list) (`POST /v3/groups`). Not idempotent: each call creates another group.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, default: "" },
    {
      key: "receiverInfo",
      label: "Receiver info",
      type: "string",
      hint: "Notes about the receivers in this list.",
    },
    {
      key: "locked",
      label: "Locked",
      type: "boolean",
      hint: "Lock the group against deletion. Vendor default: false.",
    },
    {
      key: "backup",
      label: "Backup",
      type: "boolean",
      hint: "Back the group up. Vendor default: true.",
    },
  ],
  output: [
    { key: "item", type: "object", label: "The record as CleverReach returned it" },
  ],

  async execute(input, ctx) {
    const name = optString(input.name);
    if (!name) throw new Error("`name` is required");
    const body = compact({
      name,
      receiver_info: optString(input.receiverInfo),
      locked: input.locked === undefined ? undefined : Boolean(input.locked),
      backup: input.backup === undefined ? undefined : Boolean(input.backup),
    });
    return { item: await new CleverReachClient(ctx).request("/groups", { method: "POST", body }) };
  },
};

export default action;
