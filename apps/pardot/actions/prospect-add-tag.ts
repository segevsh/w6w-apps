import type { ActionDefinition } from "@w6w/types";
import { idOf, PardotClient } from "../lib/client.ts";
import { prospectIdParam, taggedObjectOutput, tagIdParam } from "../lib/params.ts";

const prospectAddTag: ActionDefinition<{ prospectId: number; tagId: number }> = {
  key: "prospect-add-tag",
  type: "perform",
  resource: "prospect",
  title: "Add Tag to Prospect",
  description: "Tag a prospect. This creates a tagged-object record.",
  idempotent: false,
  params: [prospectIdParam, tagIdParam],
  output: taggedObjectOutput,

  async execute(input, ctx) {
    const result = await new PardotClient(ctx).request(
      `/prospects/${idOf(input.prospectId, "prospectId")}/do/addTag`,
      { method: "POST", body: { tagId: idOf(input.tagId, "tagId") } },
    );
    return result;
  },
};

export default prospectAddTag;
