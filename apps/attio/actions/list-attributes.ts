import type { ActionDefinition } from "@w6w/types";
import { AttioClient, compact, optionsFrom, PAGE_OUTPUT, pageParams } from "../lib/client.ts";

interface Input {
  target: string;
  identifier: string;
  showArchived?: boolean;
  limit?: number;
  offset?: number;
}

/** The two things attributes can hang off, verbatim from the path parameter's enum. */
export const ATTRIBUTE_TARGETS = ["objects", "lists"] as const;

/**
 * `GET /v2/{target}/{identifier}/attributes` — the schema of an object or a
 * list.
 *
 * ## Read this before writing anything
 *
 * Every write in this app is keyed by attribute slug or UUID, and this is the
 * only endpoint that tells you what those are, what **type** each attribute is,
 * and — decisively — whether it is `is_multiselect` and whether it is
 * `is_unique`. Those two booleans answer the two questions that otherwise get
 * guessed:
 *
 *  - `is_multiselect` decides whether a value must be wrapped in an array, and
 *    whether the append-versus-overwrite choice on Update Record affects it at
 *    all.
 *  - `is_unique` decides whether an attribute can be used as an Upsert Record
 *    `matching_attribute`. Pointing an upsert at a non-unique attribute is an
 *    error, and this is where to check first.
 *
 * The full property list on each attribute: `id`, `title`, `description`,
 * `api_slug`, `type`, `is_archived`, `is_required`, `is_unique`,
 * `is_multiselect`, `is_default_value_enabled`, `default_value`, `created_at`,
 * and `config` (which carries the currency code or the record-reference target
 * for those two types).
 *
 * ## One path, two kinds of parent
 *
 * `{target}` is an enum of exactly `objects` and `lists`, and the required scope
 * follows it: "When `target` is `objects`, the required scopes are
 * `object_configuration:read`. When `target` is `lists`, the required scopes are
 * `list_configuration:read`." A token granted one and not the other works for
 * half of this action, which is why the failure is a 403 rather than an empty
 * list.
 *
 * Results come back "in the order that they are sorted by in the UI", not
 * alphabetically and not by creation.
 */
const listAttributes: ActionDefinition<Input> = {
  key: "list-attributes",
  type: "read",
  resource: "attribute",
  title: "List Attributes",
  description:
    "The schema of an object or a list: every attribute with its slug, UUID, type, and the " +
    "`is_multiselect` / `is_unique` flags that decide how you write to it and whether you can " +
    "upsert on it. Returned in the order the UI sorts them.",
  params: [
    {
      key: "target",
      label: "Target",
      type: "select",
      required: true,
      default: "objects",
      options: optionsFrom(ATTRIBUTE_TARGETS),
      hint: "Whether the attributes belong to an object or to a list. Objects need " +
        "`object_configuration:read`; lists need `list_configuration:read`.",
    },
    {
      key: "identifier",
      label: "Object or list",
      type: "string",
      required: true,
      placeholder: "people",
      hint: "The `api_slug` or UUID of the object or list, matching the Target above.",
    },
    {
      key: "showArchived",
      label: "Include archived",
      type: "boolean",
      advanced: true,
      hint: "Archived attributes are hidden but keep their data — include them when reconciling " +
        "historical records.",
    },
    ...pageParams(),
  ],
  output: PAGE_OUTPUT,

  async execute(input, ctx) {
    const { records } = await new AttioClient(ctx).list(
      `/${encodeURIComponent(input.target)}/${encodeURIComponent(input.identifier)}/attributes`,
      {
        query: compact({
          show_archived: input.showArchived,
          limit: input.limit,
          offset: input.offset,
        }),
      },
    );
    return { records };
  },
};

export default listAttributes;
