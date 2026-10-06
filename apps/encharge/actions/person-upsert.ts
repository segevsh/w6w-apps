import type { ActionDefinition } from "@w6w/types";
import { EnchargeClient, jsonValue } from "../lib/client.ts";
import { personRef, personRefParams } from "../lib/people.ts";
import type { PersonRef } from "../lib/people.ts";

/**
 * Create or Update Person — `POST /v1/people` with a one-element array. Verified against the
 * OpenAPI document (`CreateUpdatePeople`), fetched 2026-10-06: "If the people exist (identified
 * by id/userId/email/another ID), they will be updated. Otherwise, people will be created."
 */
interface Input extends PersonRef {
  firstName?: string;
  lastName?: string;
  fields?: unknown;
}

const personUpsert: ActionDefinition<Input> = {
  key: "person-upsert",
  type: "perform",
  resource: "people",
  title: "Create or Update Person",
  description: "Create a person, or update them when one with the same email, user ID or " +
    "Encharge ID already exists. Custom person fields go in `Other fields`.",
  idempotent: true,
  params: [
    ...personRefParams,
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    {
      key: "fields",
      label: "Other fields (JSON)",
      type: "json",
      hint: 'Any other person fields by name, e.g. {"company":"Acme","plan":"pro"}. Create the ' +
        "field first (Create Person Field) if it does not exist. The identifiers above win on " +
        "a clash.",
    },
  ],
  output: [{
    key: "users",
    type: "array",
    label: "The created or updated person (a one-item list)",
  }],

  async execute(input, ctx) {
    const ref = personRef(input);
    const extra = jsonValue(input.fields);
    if (
      extra !== undefined && (typeof extra !== "object" || extra === null || Array.isArray(extra))
    ) {
      throw new Error("`fields` must be a JSON object of person field values.");
    }
    const person: Record<string, unknown> = { ...(extra as Record<string, unknown> ?? {}), ...ref };
    if (input.firstName) person.firstName = input.firstName;
    if (input.lastName) person.lastName = input.lastName;
    return await new EnchargeClient(ctx).request("POST", "/people", { body: [person] });
  },
};

export default personUpsert;
