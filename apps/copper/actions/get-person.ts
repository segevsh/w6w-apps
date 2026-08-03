import type { ActionDefinition } from "@w6w/types";
import { CopperClient } from "../lib/client.ts";

interface Input {
  personId: number | string;
}

/**
 * `GET /people/{id}` — one Person.
 *
 * One of the few genuinely GET-shaped calls in Copper: fetching a single record
 * by id is a GET, while listing records is a POST to `/{resource}/search`. Both
 * shapes coexist, which is exactly why the distinction is easy to blur.
 *
 * The payload includes `custom_fields` as an array of
 * `{custom_field_definition_id, value}` pairs, so resolving a custom field to a
 * human-readable name needs a second call to List Custom Field Definitions.
 *
 * Ids are unique only WITHIN a resource type — Copper is explicit that "a given
 * identifier for a Lead will never be assigned to a different Lead, but a
 * different resource such as a Person could use the same identifier". A Person
 * id is not a Lead id.
 */
const getPerson: ActionDefinition<Input> = {
  key: "get-person",
  type: "read",
  resource: "person",
  title: "Get Person",
  description:
    "Fetch a single Person by id, including addresses, emails, phone numbers, tags and custom " +
    "field values.",
  params: [
    {
      key: "personId",
      label: "Person ID",
      type: "string",
      required: true,
      hint: "Copper ids are unique per resource type — a Person id is not a Company or Lead id.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Person ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new CopperClient(ctx).request(`/people/${encodeURIComponent(String(input.personId))}`);
  },
};

export default getPerson;
