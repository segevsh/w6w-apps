import type { ActionDefinition } from "@w6w/types";
import { dataEnvelope, flatten, type JsonApiDocument, NationBuilderClient } from "../lib/client.ts";
import { SIGNUP_PARAMS, signupAttributes, type SignupInput } from "../lib/signup.ts";

/**
 * `POST /api/v2/signups` — confirmed against the vendor's OpenAPI spec and
 * the worked "Create a signup" example in the API QuickStart Guide
 * (`support.nationbuilder.com/en/articles/9869274`, fetched 2026-09-15).
 *
 * NationBuilder does not dedupe on create — two calls with the same email
 * create two people, the same reason this pack marks Mautic's and
 * Zendesk's contact-create actions non-idempotent.
 */
const personCreate: ActionDefinition<SignupInput> = {
  key: "person-create",
  type: "perform",
  resource: "person",
  title: "Create Person",
  description: 'Create a new person (NationBuilder "signup").',
  idempotent: false,
  params: SIGNUP_PARAMS,
  output: [
    { key: "id", type: "string", label: "Person ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "creating a NationBuilder person", { email: input.email });
    const res = await new NationBuilderClient(ctx).request<JsonApiDocument>("/signups", {
      method: "POST",
      body: dataEnvelope("signups", signupAttributes(input)),
    });
    return flatten(Array.isArray(res.data) ? undefined : res.data);
  },
};

export default personCreate;
