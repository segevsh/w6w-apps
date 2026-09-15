import type { ActionDefinition } from "@w6w/types";
import { dataEnvelope, flatten, type JsonApiDocument, NationBuilderClient } from "../lib/client.ts";
import { SIGNUP_PARAMS, signupAttributes, type SignupInput } from "../lib/signup.ts";

interface Input extends SignupInput {
  personId: string;
}

/**
 * `PATCH /api/v2/signups/{id}` — confirmed against the vendor's OpenAPI
 * spec. Only the fields the caller sets are sent (`compact` in
 * `lib/client.ts` drops the rest), so re-running this action with the same
 * input is safe — an untouched field is never overwritten with a blank.
 */
const personUpdate: ActionDefinition<Input> = {
  key: "person-update",
  type: "perform",
  resource: "person",
  title: "Update Person",
  description: 'Update a person (NationBuilder "signup") by id.',
  idempotent: true,
  params: [
    { key: "personId", label: "Person ID", type: "string", required: true },
    ...SIGNUP_PARAMS,
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
      { method: "PATCH", body: dataEnvelope("signups", signupAttributes(input), input.personId) },
    );
    return flatten(Array.isArray(res.data) ? undefined : res.data);
  },
};

export default personUpdate;
