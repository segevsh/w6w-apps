import type { ActionDefinition } from "@w6w/types";
import { flatten, type JsonApiDocument, NationBuilderClient } from "../lib/client.ts";

interface Input {
  personId: string;
}

/**
 * `GET /api/v2/signups/{id}` — confirmed against the vendor's OpenAPI spec
 * (`nationbuilder.com/api/v2/reference`, fetched 2026-09-15).
 *
 * NationBuilder calls this resource a "signup" everywhere in its API and
 * docs — anyone the nation has ever engaged with, not only someone who
 * filled out a signup form. This app exposes it as "person" because that is
 * what every other CRM in this pack calls the same concept.
 */
const personGet: ActionDefinition<Input> = {
  key: "person-get",
  type: "read",
  resource: "person",
  title: "Get Person",
  description: 'Fetch a person (NationBuilder "signup") by id.',
  params: [
    { key: "personId", label: "Person ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Person ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
  ],

  async execute(input, ctx) {
    const res = await new NationBuilderClient(ctx).request<JsonApiDocument>(
      `/signups/${encodeURIComponent(input.personId)}`,
    );
    return flatten(Array.isArray(res.data) ? undefined : res.data);
  },
};

export default personGet;
