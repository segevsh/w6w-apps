import type { ActionDefinition } from "@w6w/types";
import { FloatClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `DELETE /v3/people/{people_id}` — delete a person.
 *
 * Irreversible: deleting a person also deletes every allocation (`task_id`)
 * and logged-time entry for them.
 */
interface Input {
  people_id: number;
}

const personDelete: ActionDefinition<Input> = {
  key: "person-delete",
  type: "perform",
  resource: "person",
  title: "Delete Person",
  description:
    "Delete a person. This also deletes all of their allocations and logged time — irreversible.",
  idempotent: true,
  params: [idParam("people_id", "Person ID")],
  output: [],

  async execute(input, ctx) {
    await new FloatClient(ctx).remove(`/people/${input.people_id}`);
    return { deleted: true, people_id: input.people_id };
  },
};

export default personDelete;
