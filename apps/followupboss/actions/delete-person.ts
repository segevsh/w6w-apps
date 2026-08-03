import type { ActionDefinition } from "@w6w/types";
import { FubClient } from "../lib/client.ts";

interface Input {
  id: number;
}

/**
 * `DELETE /people/{id}` — delete a contact.
 *
 * Marked `idempotent: true` in the retry sense the field means: re-running it
 * converges on the same end state (the person is gone) rather than creating
 * something new each time. A repeat call answers 404, which is the correct
 * report of "already deleted".
 *
 * Worth knowing before reaching for this: Follow Up Boss's normal way of
 * retiring a contact is the **`Trash` stage**, not deletion. `GET /people`
 * excludes trashed people by default, which is why a trashed contact looks
 * deleted from the API's point of view. Moving someone to `Trash` with Update
 * Person is reversible; this is not.
 */
const deletePerson: ActionDefinition<Input> = {
  key: "delete-person",
  type: "perform",
  resource: "person",
  title: "Delete Person",
  idempotent: true,
  description:
    "Permanently delete a contact by id. Consider moving them to the `Trash` stage with Update " +
    "Person instead — that is Follow Up Boss's reversible equivalent, and searches already " +
    "exclude trashed people by default.",
  params: [{ key: "id", label: "Person id", type: "number", required: true }],
  output: [{ key: "id", type: "number", label: "Deleted person id" }],

  async execute(input, ctx) {
    await new FubClient(ctx).request(`/people/${input.id}`, { method: "DELETE" });
    // The API answers a bodyless success here, so echo the id back rather than
    // handing a workflow `undefined` — the next step almost always wants to know
    // which record this was.
    return { id: input.id };
  },
};

export default deletePerson;
