import type { TriggerDefinition } from "@w6w/types";
import action from "../actions/collection-sharing-list.ts";
import { snapshotAdded } from "../lib/triggers.ts";

/**
 * Collaborators of one collection the user picks. `GET /collection/{id}/sharing` documents no
 * paging or order, so the whole list is diffed. Events carry the vendor's record, including the
 * collaborator's email (blank when the token only has read access).
 */
const trigger: TriggerDefinition = {
  key: "new-collaborator",
  title: "New Collaborator",
  description: "The run gets each person newly added as a collaborator on the chosen collection.",
  params: [{
    key: "collectionId",
    label: "Collection ID",
    type: "number",
    required: true,
    validation: { integer: true },
    hint: "The `_id` of the shared collection to watch, from List Collections.",
  }],
  output: [
    { key: "_id", type: "number", label: "User ID" },
    { key: "fullName", type: "string", label: "Name" },
    { key: "role", type: "string", label: "Role" },
  ],
  sample: { _id: 9001, fullName: "Ada Lovelace", email: "ada@example.org", role: "member" },
  minIntervalMs: 300_000,
  async poll({ state, params }, ctx) {
    const raw = (params as { collectionId?: unknown }).collectionId;
    const id = Number(raw);
    if (raw === undefined || raw === null || raw === "" || !Number.isInteger(id)) {
      throw new Error("new-collaborator: collectionId is required");
    }
    const out = await action.execute({ id }, ctx) as { items?: unknown[] };
    return snapshotAdded(state, out.items ?? [], (i) => String(i._id));
  },
};

export default trigger;
