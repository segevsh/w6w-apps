import type { ActionDefinition } from "@w6w/types";
import { EnchargeClient } from "../lib/client.ts";
import { peopleParam, peopleQuery, personRefParams, personRefs } from "../lib/people.ts";
import type { PersonRefInput } from "../lib/people.ts";

/**
 * Get People — `GET /v1/people?people[0][email]=…`. Verified against the OpenAPI document
 * (encharge-app-resources.s3.amazonaws.com/merged.yaml, `GetSpecificPeople`), fetched 2026-10-06.
 */
const personGet: ActionDefinition<PersonRefInput> = {
  key: "person-get",
  type: "read",
  resource: "people",
  title: "Get People",
  description: "Retrieve one or more people by email, user ID or Encharge ID. Returns a `users` " +
    "list with each person's fields.",
  params: [...personRefParams, peopleParam],
  output: [
    {
      key: "users",
      type: "array",
      label: "The matching people (id, email, userId, name, custom fields)",
    },
  ],

  async execute(input, ctx) {
    return await new EnchargeClient(ctx).request("GET", "/people", {
      query: peopleQuery(personRefs(input)),
    });
  },
};

export default personGet;
