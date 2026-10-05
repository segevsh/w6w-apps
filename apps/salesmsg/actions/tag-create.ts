import type { ActionDefinition } from "@w6w/types";
import { SalesmsgClient } from "../lib/client.ts";

/**
 * `POST /tags` (scope `tags:write`). The label is a **query parameter**. The schema allows 50
 * characters while the prose says 15; the schema bound is enforced here and the server has the
 * last word.
 */
interface Input {
  label: string;
}

const tagCreate: ActionDefinition<Input> = {
  key: "tag-create",
  type: "perform",
  resource: "tag",
  title: "Create Tag",
  description: "Create a tag.",
  idempotent: false,
  params: [
    {
      key: "label",
      label: "Label",
      type: "string",
      required: true,
      hint: "The tag label.",
      validation: { maxLength: 50 },
    },
  ],
  output: [{ key: "response", type: "object", label: "The created tag" }],

  execute(input, ctx) {
    return new SalesmsgClient(ctx).json("/tags", {
      method: "POST",
      query: {
        label: input.label,
      },
    });
  },
};

export default tagCreate;
