import type { ActionDefinition } from "@w6w/types";
import { BambooClient } from "../lib/client.ts";

/**
 * `GET /api/v1/meta/lists` — the company's list fields and their allowed values.
 *
 * The companion to List Fields. Where that names every field, this one gives the
 * *option sets* for the fields that are dropdowns — department, division,
 * location, employment status, and any custom list. Writing an invalid value to
 * a list field is a 409 ("for lists, duplicate values are not allowed") or a
 * rejected update, so this is the lookup that makes Update Employee safe for
 * those fields.
 *
 * A note on the `format` parameter, which this action deliberately does NOT
 * expose: it is documented as "Set to `json` to receive JSON output **as an
 * alternative to using the Accept header**". It is a workaround for the XML
 * default, and `BambooClient` already sends `Accept: application/json` on every
 * request. Offering both would be two switches for one outcome, with the
 * unpleasant property that turning the visible one *off* changes nothing.
 */
const listListFields: ActionDefinition<Record<string, never>> = {
  key: "list-list-fields",
  type: "search",
  resource: "field",
  title: "List List Fields",
  description:
    "List the company's list (dropdown) fields with their allowed values — department, division, " +
    "location, employment status and any custom lists.",
  params: [],
  output: [{ key: "lists", type: "array", label: "List fields, each with its allowed options" }],

  execute(_input, ctx) {
    return new BambooClient(ctx).request("/meta/lists");
  },
};

export default listListFields;
