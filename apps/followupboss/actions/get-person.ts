import type { ActionDefinition } from "@w6w/types";
import { FIELDS_PARAM, FubClient } from "../lib/client.ts";

interface Input {
  id: number;
  fields?: string;
}

/**
 * `GET /people/{id}` — fetch one contact.
 *
 * The endpoint declares exactly two parameters: the path `id` and the `fields`
 * query string. `fields` matters more here than on the search, because a
 * single-record read is where you usually want the full picture — the documented
 * special values are `allCustom` (every custom field) and `allFields`
 * (everything, custom fields included).
 */
const getPerson: ActionDefinition<Input> = {
  key: "get-person",
  type: "read",
  resource: "person",
  title: "Get Person",
  description: "Retrieve a single contact by id, optionally widening which fields come back.",
  params: [
    { key: "id", label: "Person id", type: "number", required: true },
    FIELDS_PARAM,
  ],
  output: [{ key: "id", type: "number", label: "Person id" }],

  execute(input, ctx) {
    return new FubClient(ctx).request(`/people/${input.id}`, {
      query: { fields: input.fields },
    });
  },
};

export default getPerson;
