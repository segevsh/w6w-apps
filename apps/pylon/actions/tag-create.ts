import type { ActionDefinition } from "@w6w/types";
import { compact, PylonClient } from "../lib/client.ts";
import { TAG_OUTPUT } from "../lib/params.ts";

interface Input {
  value: string;
  objectType: string;
  hexColor?: string;
}

/** `POST /tags` — `object_type` and `value` are required. */
const tagCreate: ActionDefinition<Input> = {
  key: "tag-create",
  type: "perform",
  resource: "tag",
  title: "Create Tag",
  description: "Create a tag for issues, accounts or articles.",
  idempotent: false,
  params: [
    { key: "value", label: "Value", type: "string", required: true },
    {
      key: "objectType",
      label: "Applies to",
      type: "select",
      required: true,
      options: [
        { value: "issue", label: "Issues" },
        { value: "account", label: "Accounts" },
        { value: "article", label: "Articles" },
      ],
    },
    { key: "hexColor", label: "Hex color", type: "string", placeholder: "#3b82f6" },
  ],
  output: TAG_OUTPUT,

  execute(input, ctx) {
    return new PylonClient(ctx).one("POST", "/tags", {
      body: compact({
        value: input.value,
        object_type: input.objectType,
        hex_color: input.hexColor,
      }),
    });
  },
};

export default tagCreate;
