import type { ActionDefinition } from "@w6w/types";
import { CopperClient } from "../lib/client.ts";

interface Input {
  personId: number | string;
}

/**
 * `DELETE /people/{id}` — delete a Person.
 *
 * Idempotent in the sense that matters for retries: the record is gone after the
 * first call and stays gone. Copper answers a repeat with a 404, which surfaces
 * as an error — the effect is unchanged, but a workflow that retries blindly
 * should expect the second call to be noisy.
 *
 * Unlike Activities, which Copper keeps as readable stubs after deletion, a
 * deleted Person is not recoverable through the API.
 */
const deletePerson: ActionDefinition<Input> = {
  key: "delete-person",
  type: "perform",
  resource: "person",
  title: "Delete Person",
  description: "Delete a Person by id. Not recoverable through the API.",
  idempotent: true,
  params: [
    { key: "personId", label: "Person ID", type: "string", required: true },
  ],
  output: [{ key: "id", type: "number", label: "Deleted Person ID" }],

  execute(input, ctx) {
    return new CopperClient(ctx).request(
      `/people/${encodeURIComponent(String(input.personId))}`,
      { method: "DELETE" },
    );
  },
};

export default deletePerson;
