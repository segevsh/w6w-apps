import type { ActionDefinition } from "@w6w/types";
import { idOf, PardotClient } from "../lib/client.ts";
import { prospectIdParam, tagIdParam } from "../lib/params.ts";

const prospectRemoveTag: ActionDefinition<{ prospectId: number; tagId: number }> = {
  key: "prospect-remove-tag",
  type: "perform",
  resource: "prospect",
  title: "Remove Tag from Prospect",
  description: "Remove a tag from a prospect. The tagged-object record is deleted.",
  idempotent: true,
  params: [prospectIdParam, tagIdParam],
  output: [{ key: "removed", type: "boolean", label: "Removed" }],

  async execute(input, ctx) {
    const result = await new PardotClient(ctx).request(
      `/prospects/${idOf(input.prospectId, "prospectId")}/do/removeTag`,
      { method: "POST", body: { tagId: idOf(input.tagId, "tagId") } },
    );
    return result ?? { removed: true };
  },
};

export default prospectRemoveTag;
