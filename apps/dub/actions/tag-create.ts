import type { ActionDefinition } from "@w6w/types";
import { compact, DubClient } from "../lib/client.ts";
import { TAG_COLORS, TAG_OUTPUT } from "../lib/tags.ts";

interface Input {
  name: string;
  color?: string;
}

/** `POST /tags` — answers 201. The deprecated `tag` body field is not used. */
const tagCreate: ActionDefinition<Input> = {
  key: "tag-create",
  type: "perform",
  resource: "tag",
  title: "Create Tag",
  description: "Create a tag for organising links. A random color is picked when none is given.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      validation: { maxLength: 190 },
    },
    { key: "color", label: "Color", type: "select", options: TAG_COLORS },
  ],
  output: TAG_OUTPUT,

  execute(input, ctx) {
    return new DubClient(ctx).request("POST", "/tags", {
      body: compact({ name: input.name, color: input.color }),
    });
  },
};

export default tagCreate;
