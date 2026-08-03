import type { ActionDefinition } from "@w6w/types";
import { AttioClient, OBJECT_PARAM } from "../lib/client.ts";
import {
  flattenValues,
  MATCHING_ATTRIBUTE_PARAM,
  RECORD_VALUES_PARAM,
  recordValues,
} from "../lib/values.ts";

interface Input {
  object: string;
  matchingAttribute: string;
  values: unknown;
}

/**
 * `PUT /v2/objects/{object}/records?matching_attribute=…` — create or update in
 * one call. The action most integrations should be using.
 *
 * ## What "assert" means here
 *
 * Verbatim: "Use this endpoint to create or update people, companies and other
 * records. A matching attribute is used to search for existing records. If a
 * record is found with the same value for the matching attribute, that record
 * will be updated. If no record with the same value for the matching attribute
 * is found, a new record will be created instead."
 *
 * (Attio's docs call these "assert" endpoints in places and "upsert" in others —
 * the reference page is titled "Upsert a record" and the task-linking schema
 * refers to "Attio's assert endpoints". Same thing.)
 *
 * ## `matching_attribute` is required, singular, and must be UNIQUE
 *
 * It is `required: true` on the query string. There is no default and no
 * multi-attribute matching. The attribute named must be flagged unique on the
 * object — for companies the docs state "`domains` is the only unique
 * attribute"; for people it is `email_addresses`.
 *
 * Naming a non-unique attribute is an error, not a fuzzy match. If more than one
 * record could match, this endpoint does not guess.
 *
 * ## The multiselect rule inverts for the matching attribute itself
 *
 * The most easily-missed sentence on the page, and it is a two-clause rule that
 * treats one attribute differently from all the others:
 *
 *   > "If the matching attribute is a multiselect attribute, new values will be
 *   > added and existing values will not be deleted. For any other multiselect
 *   > attribute, all values will be either created or deleted as necessary to
 *   > match the list of supplied values."
 *
 * So upserting a person on `email_addresses` **adds** the supplied address to
 * whatever addresses they already have, while the `phone_numbers` in the same
 * payload become exactly the supplied set and the old ones are deleted. One
 * request, two opposite behaviours, decided by which attribute you matched on.
 * Both halves are on the `matchingAttribute` hint.
 *
 * ## No conflict, by construction
 *
 * Unlike Create Record, which "will throw on conflicts of unique attributes",
 * this endpoint resolves the conflict by updating. That is what makes it the
 * right shape for anything driven by an external source of truth — a form, a
 * webhook, a nightly sync — where the same person legitimately arrives twice.
 */
const upsertRecord: ActionDefinition<Input> = {
  key: "upsert-record",
  type: "perform",
  resource: "record",
  title: "Upsert Record",
  idempotent: true,
  description:
    "Create a record, or update the existing one that matches on a unique attribute. The " +
    "standard integration shape for lead intake and syncs. Note the asymmetry: values of the " +
    "matching attribute are ADDED, while every other multi-select attribute is set to exactly " +
    "what you supply.",
  params: [OBJECT_PARAM, MATCHING_ATTRIBUTE_PARAM, RECORD_VALUES_PARAM],
  output: [
    { key: "id", type: "object", label: "Composite id of the created or updated record" },
    { key: "values", type: "object", label: "Attribute values as stored after the write" },
    { key: "values_flat", type: "object", label: "The same values reduced to scalars" },
    { key: "created_at", type: "string", label: "Creation timestamp" },
    { key: "web_url", type: "string", label: "Link to the record in the Attio UI" },
  ],

  async execute(input, ctx) {
    const record = await new AttioClient(ctx).data<Record<string, unknown>>(
      `/objects/${encodeURIComponent(input.object)}/records`,
      {
        method: "PUT",
        query: { matching_attribute: input.matchingAttribute },
        body: recordValues(input.values),
      },
    );
    return { ...record, values_flat: flattenValues(record?.values) };
  },
};

export default upsertRecord;
