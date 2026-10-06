import type { ActionDefinition } from "@w6w/types";
import { SimpleroClient } from "../lib/client.ts";
import { compact } from "../lib/params.ts";

interface Input {
  name: string;
  description?: string;
  color?: string;
}

const tagCreate: ActionDefinition<Input> = {
  key: "tag-create",
  type: "perform",
  resource: "tag",
  title: "Create Tag",
  description: "Create a tag that can then be applied to contacts.",
  // No idempotency key is documented, and a repeated name is not documented as a no-op.
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "string" },
    {
      key: "color",
      label: "Color",
      type: "string",
      hint: "Simplero's spec does not state the color format; leave blank for the default.",
    },
  ],
  output: [{ key: "record", type: "object", label: "The created tag" }],

  async execute(input, ctx) {
    const record = await new SimpleroClient(ctx).write(
      "POST",
      "/tags",
      compact({ name: input.name, description: input.description, color: input.color }),
    );
    return { record };
  },
};

export default tagCreate;
