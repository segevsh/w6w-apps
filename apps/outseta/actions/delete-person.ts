import type { ActionDefinition } from "@w6w/types";
import { OutsetaClient, pathId } from "../lib/client.ts";

interface Input {
  personUid: string;
}

/** `DELETE /api/v1/crm/people/{personUid}` — Delete a person record. Irreversible. */
const deletePerson: ActionDefinition<Input> = {
  key: "delete-person",
  type: "perform",
  resource: "person",
  title: "Delete Person",
  description: "Delete a person record. Irreversible.",
  idempotent: true,
  params: [
    {
      key: "personUid",
      label: "Person Uid",
      type: "string",
      hint: "The person's Uid (the short alphanumeric id, e.g. `wZmNZm2O`).",
      required: true,
    },
  ],
  output: [
    {
      key: "deleted",
      type: "boolean",
      label: "Deleted",
    },
    {
      key: "uid",
      type: "string",
      label: "Uid of the deleted record",
    },
  ],

  async execute(input, ctx) {
    await OutsetaClient.fromConnection(ctx).request(`/crm/people/${pathId(input.personUid)}`, {
      method: "DELETE",
    });
    return { deleted: true, uid: input.personUid };
  },
};

export default deletePerson;
