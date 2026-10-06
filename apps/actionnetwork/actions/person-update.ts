import type { ActionDefinition } from "@w6w/types";
import { ActionNetworkClient, need, seg } from "../lib/client.ts";
import { idParam, type Input } from "../lib/factory.ts";
import { BACKGROUND_PARAM, buildPerson, PERSON_OUTPUT, PERSON_PARAMS } from "../lib/person.ts";

/** `PUT /people/{id}` — an upsert: nothing is removed unless explicitly nulled. */
const personUpdate: ActionDefinition<Input> = {
  key: "person-update",
  type: "perform",
  resource: "person",
  title: "Update Person",
  description:
    "Change fields on a person by id. Only the fields you set are sent. Changing an email to one that already belongs to another person is silently ignored and the unchanged person comes back.",
  idempotent: true,
  params: [idParam("personId", "Person ID"), ...PERSON_PARAMS, BACKGROUND_PARAM],
  output: PERSON_OUTPUT,

  execute(input, ctx) {
    const body = buildPerson(input);
    if (Object.keys(body).length === 0) throw new Error("set at least one field to change");
    return new ActionNetworkClient(ctx).update(
      `/people/${seg(need(input, "personId"))}`,
      body,
      input.backgroundRequest === true,
    );
  },
};

export default personUpdate;
