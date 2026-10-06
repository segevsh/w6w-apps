import type { ActionDefinition } from "@w6w/types";
import { CleverReachClient, json, pathId } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "receiver-upsert",
  type: "perform",
  resource: "receiver",
  title: "Upsert receivers",
  description:
    "Update receivers, or create them when the email is new, in one call (`POST /v3/groups/{group_id}/receivers/upsert`). Takes a JSON array of receiver objects in the vendor's own shape (`email`, `registered`, `activated`, `source`, `attributes`, `global_attributes`, `tags`). With `deactivated` set to 0 an existing inactive receiver may be reactivated.",
  idempotent: true,
  params: [
    { key: "groupId", label: "Group ID", type: "string", required: true, default: "" },
    {
      key: "receivers",
      label: "Receivers",
      type: "json",
      required: true,
      hint:
        'JSON array, e.g. `[{"email":"bruce@gotham.com","global_attributes":{"firstname":"Bruce"}}]`.',
    },
  ],
  output: [
    { key: "result", type: "object", label: "CleverReach's response body" },
  ],

  async execute(input, ctx) {
    const parsed = json(input.receivers, "receivers");
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("`receivers` must be a non-empty JSON array");
    }
    parsed.forEach((r, i) => {
      if (!r || typeof r !== "object" || !String((r as { email?: unknown }).email ?? "").trim()) {
        throw new Error(`\`receivers[${i}].email\` is required`);
      }
    });
    return {
      result: await new CleverReachClient(ctx).request(
        `/groups/${pathId(input.groupId, "groupId")}/receivers/upsert`,
        {
          method: "POST",
          body: parsed,
        },
      ),
    };
  },
};

export default action;
