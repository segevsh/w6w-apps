import type { ActionDefinition } from "@w6w/types";
import { compact, RingoverClient } from "../lib/client.ts";
import { TAG_COLORS } from "../lib/params.ts";

interface Input {
  name: string;
  color?: string;
  description?: string;
}

const tagCreate: ActionDefinition<Input> = {
  key: "tag-create",
  type: "perform",
  resource: "tag",
  title: "Create Tag",
  description: "Create a team-wide call tag. Needs IVRs Write on the key.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "color", label: "Color", type: "select", options: TAG_COLORS },
    { key: "description", label: "Description", type: "string" },
  ],
  output: [
    { key: "created", type: "boolean", label: "Created" },
    { key: "name", type: "string", label: "Tag name" },
  ],

  async execute(input, ctx) {
    await new RingoverClient(ctx).request("POST", "/tags", {
      body: compact({
        name: input.name,
        color: input.color || undefined,
        description: input.description,
      }),
    });
    return { created: true, name: input.name };
  },
};

export default tagCreate;
