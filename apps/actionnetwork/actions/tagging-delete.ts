import type { ActionDefinition } from "@w6w/types";
import { ActionNetworkClient, need, seg } from "../lib/client.ts";
import { idParam, type Input } from "../lib/factory.ts";
import { BACKGROUND_PARAM } from "../lib/person.ts";

/** `DELETE /tags/{id}/taggings/{taggingId}` — removes the tag from that one person. */
const taggingDelete: ActionDefinition<Input> = {
  key: "tagging-delete",
  type: "perform",
  resource: "tagging",
  title: "Remove Tag From Person",
  description:
    "Delete a tagging, removing the tag from that person. Needs the tagging id (from List Taggings), not the person id. To untag by name, use Create or Update Person with Remove tags.",
  idempotent: true,
  params: [idParam("tagId", "Tag ID"), idParam("taggingId", "Tagging ID"), BACKGROUND_PARAM],
  output: [{ key: "notice", type: "string", label: "Confirmation from the vendor" }],

  execute(input, ctx) {
    return new ActionNetworkClient(ctx).request(
      "DELETE",
      `/tags/${seg(need(input, "tagId"))}/taggings/${seg(need(input, "taggingId"))}`,
      { background: input.backgroundRequest === true },
    );
  },
};

export default taggingDelete;
