import type { ActionDefinition } from "@w6w/types";
import { CleverReachClient, compact, optEnum, optString } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "attribute-create",
  type: "perform",
  resource: "attribute",
  title: "Create an attribute",
  description:
    "Create a global attribute, or a group attribute when a group id is given (`POST /v3/attributes`). Not idempotent.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      default: "",
      hint: "For internal use.",
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      options: [{ value: "text", label: "Text" }, { value: "number", label: "Number" }, {
        value: "gender",
        label: "Gender",
      }, { value: "date", label: "Date" }],
    },
    {
      key: "groupId",
      label: "Group ID",
      type: "string",
      hint: "Leave empty for a global attribute.",
    },
    { key: "description", label: "Description", type: "string" },
    { key: "previewValue", label: "Preview value", type: "string" },
    { key: "defaultValue", label: "Default value", type: "string" },
  ],
  output: [
    { key: "item", type: "object", label: "The record as CleverReach returned it" },
  ],

  async execute(input, ctx) {
    const name = optString(input.name);
    if (!name) throw new Error("`name` is required");
    const type = optEnum(input.type, "type", ["text", "number", "gender", "date"] as const);
    if (!type) throw new Error("`type` is required");
    const body = compact({
      name,
      type,
      group_id: optString(input.groupId),
      description: optString(input.description),
      preview_value: optString(input.previewValue),
      default_value: optString(input.defaultValue),
    });
    return {
      item: await new CleverReachClient(ctx).request("/attributes", { method: "POST", body }),
    };
  },
};

export default action;
