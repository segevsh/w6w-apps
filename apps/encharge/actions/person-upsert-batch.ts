import type { ActionDefinition } from "@w6w/types";
import { EnchargeClient, jsonValue } from "../lib/client.ts";
import { personRef } from "../lib/people.ts";
import type { PersonRef } from "../lib/people.ts";

/**
 * Create or Update People (batch) — `POST /v1/people` with an array of person objects. Verified
 * against the OpenAPI document (`CreateUpdatePeople`, body "Array of EndUser objects"), fetched
 * 2026-10-06.
 */
interface Input {
  people: unknown;
}

const personUpsertBatch: ActionDefinition<Input> = {
  key: "person-upsert-batch",
  type: "perform",
  resource: "people",
  title: "Create or Update People (batch)",
  description: "Create or update several people in one call from a JSON array. Each object " +
    "needs an email, userId or id, plus any person fields to set.",
  idempotent: true,
  params: [
    {
      key: "people",
      label: "People (JSON array)",
      type: "json",
      required: true,
      hint: 'e.g. [{"email":"a@x.com","firstName":"Ada"},{"userId":"42","plan":"pro"}]',
    },
  ],
  output: [{ key: "users", type: "array", label: "The created or updated people" }],

  async execute(input, ctx) {
    const raw = jsonValue(input.people);
    if (!Array.isArray(raw) || raw.length === 0) {
      throw new Error("`people` must be a non-empty JSON array of person objects.");
    }
    const people = raw.map((p, i) => {
      if (!p || typeof p !== "object" || Array.isArray(p)) {
        throw new Error(`people[${i}] must be an object.`);
      }
      const rec = p as Record<string, unknown> & PersonRef;
      return { ...rec, ...personRef(rec) };
    });
    return await new EnchargeClient(ctx).request("POST", "/people", { body: people });
  },
};

export default personUpsertBatch;
