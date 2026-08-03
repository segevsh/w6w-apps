import type { ActionDefinition } from "@w6w/types";
import { KitClient } from "../lib/client.ts";

interface Input {
  name: string;
}

/**
 * `idempotent: true` — Kit documents creation as idempotent on name, matched
 * case-insensitively: an existing name returns `200` with the existing tag
 * rather than creating a duplicate (a genuinely new tag returns `201`).
 */
const createTag: ActionDefinition<Input> = {
  key: "create-tag",
  type: "perform",
  resource: "tag",
  title: "Create Tag",
  description:
    "Create a tag. Idempotent on name, matched case-insensitively — an existing name returns the existing tag rather than a duplicate.",
  idempotent: true,
  params: [
    { key: "name", label: "Name", type: "string", required: true, placeholder: "Newsletter" },
  ],
  output: [{ key: "tag", type: "object", label: "Tag" }],

  execute(input, ctx) {
    return new KitClient(ctx).request("/tags", {
      method: "POST",
      body: { name: input.name },
    });
  },
};

export default createTag;
