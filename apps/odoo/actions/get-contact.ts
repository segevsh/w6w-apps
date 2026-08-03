import type { ActionDefinition } from "@w6w/types";
import { CONTEXT_PARAM, FIELDS_PARAM, OdooClient, splitFields, toIds } from "../lib/client.ts";

interface Input {
  ids: unknown;
  fields?: string;
  context?: Record<string, unknown>;
}

/**
 * `res.partner.read` — fetch specific contacts by id.
 *
 * `read` takes the recordset POSITIONALLY and the field list as a keyword:
 * `args: [[166]]`, `kwargs: {fields: [...]}`. Verified live (2026-08-03),
 * returning `[{"id":166,"name":"W6W Probe Co","is_company":false}]`.
 *
 * ## Missing ids are SKIPPED, not an error — check `count`
 *
 * It is natural to assume `read` raises `MissingError` for an id that is gone,
 * because `unlink` does. It does not. Verified live (2026-08-03): reading a
 * just-deleted id returned `[]` — a plain empty list, no error. Reading a mix of
 * live and dead ids likewise returns only the live ones.
 *
 * So a caller asking for five records can legitimately get three back and no
 * error at all. `count` is returned alongside `records` precisely so a workflow
 * can notice that, rather than assuming the lengths match.
 */
const getContact: ActionDefinition<Input> = {
  key: "get-contact",
  type: "read",
  resource: "res.partner",
  title: "Get Contact",
  description:
    "Read one or more contacts (`res.partner`) by record id. Ids that no longer exist are " +
    "skipped silently rather than raising — compare `count` against the ids you asked for.",
  params: [
    {
      key: "ids",
      label: "Record IDs",
      type: "string",
      required: true,
      placeholder: "42",
      hint: "A single id, or several separated by commas.",
    },
    FIELDS_PARAM,
    CONTEXT_PARAM,
  ],
  output: [
    { key: "records", type: "array", label: "Records" },
    { key: "count", type: "number", label: "Number of records returned" },
  ],

  async execute(input, ctx) {
    const kwargs: Record<string, unknown> = {};
    const fields = splitFields(input.fields);
    if (fields) kwargs.fields = fields;
    if (input.context) kwargs.context = input.context;

    const records = await OdooClient.fromConnection(ctx).call<Record<string, unknown>[]>(
      "res.partner",
      "read",
      [toIds(input.ids)],
      kwargs,
    );
    return { records, count: records.length };
  },
};

export default getContact;
