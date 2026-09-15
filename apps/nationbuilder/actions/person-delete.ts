import type { ActionDefinition } from "@w6w/types";
import { NationBuilderClient } from "../lib/client.ts";

interface Input {
  personId: string;
  confirm: boolean;
}

/**
 * `DELETE /api/v2/signups/{id}` — confirmed against the vendor's OpenAPI
 * spec. This is the most destructive call in the app — deleting a person
 * removes their donation, event and path history along with them — so it is
 * gated behind an explicit confirmation, the same pattern this pack uses for
 * Mautic's `contact-delete` and Gitea's `repo-delete`.
 */
const personDelete: ActionDefinition<Input> = {
  key: "person-delete",
  type: "perform",
  resource: "person",
  title: "Delete Person",
  description: 'Permanently delete a person (NationBuilder "signup") and their history.',
  idempotent: true,
  params: [
    { key: "personId", label: "Person ID", type: "string", required: true },
    {
      key: "confirm",
      label: "I understand this person's history cannot be recovered",
      type: "boolean",
      required: true,
      default: false,
    },
  ],
  output: [
    { key: "id", type: "string", label: "Person ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    if (input.confirm !== true) {
      throw new Error("`confirm` must be true — deleting a person cannot be undone");
    }
    ctx.log("warn", "deleting a NationBuilder person", { personId: input.personId });
    await new NationBuilderClient(ctx).request(
      `/signups/${encodeURIComponent(input.personId)}`,
      { method: "DELETE" },
    );
    return { id: input.personId, deleted: true };
  },
};

export default personDelete;
