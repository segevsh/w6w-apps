import type { ActionDefinition } from "@w6w/types";
import { compact, DixaClient } from "../lib/client.ts";
import { requireText } from "../lib/params.ts";

interface Input {
  name: string;
  color?: string;
}

const tagCreate: ActionDefinition<Input> = {
  key: "tag-create",
  type: "perform",
  resource: "tag",
  title: "Create Tag",
  description: "Create a tag that can then be put on conversations.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "color", label: "Color", type: "string", hint: "Optional colour string." },
  ],
  output: [{ key: "data", type: "object", label: "The created tag: { id, name, color, state }" }],

  execute(input, ctx) {
    return new DixaClient(ctx).json("/tags", {
      method: "POST",
      body: { name: requireText(input.name, "name"), ...compact({ color: input.color?.trim() }) },
    });
  },
};

export default tagCreate;
