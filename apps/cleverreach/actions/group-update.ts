import type { ActionDefinition } from "@w6w/types";
import { CleverReachClient, compact, optString, pathId } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "group-update",
  type: "perform",
  resource: "group",
  title: "Update a group",
  description:
    "Change a group's name, notes, lock or backup flag (`PUT /v3/groups/{id}`). Send only what you want to change.",
  idempotent: true,
  params: [
    { key: "groupId", label: "Group ID", type: "string", required: true, default: "" },
    { key: "name", label: "Name", type: "string" },
    { key: "receiverInfo", label: "Receiver info", type: "string" },
    { key: "locked", label: "Locked", type: "boolean" },
    { key: "backup", label: "Backup", type: "boolean" },
  ],
  output: [
    { key: "item", type: "object", label: "The record as CleverReach returned it" },
  ],

  async execute(input, ctx) {
    const id = pathId(input.groupId, "groupId");
    const body = compact({
      name: optString(input.name),
      receiver_info: optString(input.receiverInfo),
      locked: input.locked === undefined ? undefined : Boolean(input.locked),
      backup: input.backup === undefined ? undefined : Boolean(input.backup),
    });
    if (Object.keys(body).length === 0) {
      throw new Error("nothing to update: set at least one field");
    }
    return {
      item: await new CleverReachClient(ctx).request(`/groups/${id}`, { method: "PUT", body }),
    };
  },
};

export default action;
