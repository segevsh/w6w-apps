import type { ActionDefinition } from "@w6w/types";
import { CloudinaryClient } from "../lib/client.ts";

/**
 * `GET /metadata_fields` — the structured metadata schema.
 *
 * Structured metadata is Cloudinary's typed, validated alternative to
 * `context`: fields are defined once for the account with a type (string,
 * number, date, enum, set) and optional validation, and every write is checked
 * against them.
 *
 * Reading the schema is not optional if a workflow intends to *write* it.
 * `asset-update`'s Structured Metadata takes an object keyed by **external
 * id**, not by the human label, and an enum field's value must be one of the
 * defined `datasource` entries — so this is where those ids and allowed values
 * come from. Writing an undefined field is rejected; writing an undefined enum
 * value is rejected too.
 */
const action: ActionDefinition = {
  key: "metadata-field-list",
  type: "read",
  resource: "account",
  title: "List structured metadata fields",
  description:
    "The account's structured metadata schema — the external ids and allowed enum values that " +
    "writing metadata has to match.",
  params: [],
  output: [
    { key: "metadata_fields", type: "array", label: "Metadata fields" },
  ],

  async execute(_input, ctx) {
    return await new CloudinaryClient(ctx).request("/metadata_fields");
  },
};

export default action;
