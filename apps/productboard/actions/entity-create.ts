import type { ActionDefinition } from "@w6w/types";
import {
  asJson,
  asOptionalJson,
  compact,
  type DataResult,
  ProductboardClient,
} from "../lib/client.ts";
import { entityTypeOptions } from "../lib/params.ts";

/**
 * `POST /v2/entities` — create an entity of any type.
 *
 * `fields` is a free-form `json` param rather than a generated form, and that is
 * a consequence of the API's design, not a shortcut: `EntityCreateOrUpdateFields`
 * is declared as `additionalProperties` with no fixed keys, because the legal
 * keys are whatever this workspace has configured. Run
 * `entity-configuration-get` for the type first — it returns each field's name,
 * type, validation rules and whether it is settable at create time.
 *
 * Two things about `fields` that are easy to get wrong, both from the vendor's
 * own schema notes:
 *
 *  - **Most fields accept two input shapes** — a bare value (`"Some name"`) or
 *    an object carrying metadata (`{"value": "Some name", "metadata": {...}}`).
 *  - **References accept an id or a natural key** — `status` takes
 *    `{"id": …}` or `{"name": "In Progress"}`, `owner` takes `{"id": …}` or
 *    `{"email": "john@doe.com"}`, `teams` takes either per element.
 *
 * `metadata.source` is the stamp that makes a created record findable again:
 * set `{"source": {"system": "sfdc", "recordId": "A-1"}}` and the
 * `metadata[source][*]` filters on `entity-list` will find it later. Nothing
 * else provides that lookup.
 *
 * **Not idempotent.** The endpoint accepts no idempotency key of any kind, so a
 * retry creates a second entity. `metadata.source.recordId` is the only handle
 * on the duplicate afterwards, which is another reason to set it.
 */
interface Input {
  type: string;
  fields: unknown;
  relationships?: unknown;
  metadata?: unknown;
}

const entityCreate: ActionDefinition<Input, DataResult> = {
  key: "entity-create",
  type: "perform",
  resource: "entity",
  title: "Create entity",
  description:
    "Create a product, component, feature, subfeature, initiative, objective, key result, " +
    "release, release group, company or user.",
  idempotent: false,
  params: [
    {
      key: "type",
      label: "Entity type",
      type: "select",
      required: true,
      options: entityTypeOptions,
    },
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: true,
      placeholder: '{"name": "Awesome Public API", "owner": {"email": "john@doe.com"}}',
      hint:
        "Field keys are whatever this workspace has configured — run Get entity configuration " +
        "for this type to list them. Custom fields are keyed by their UUID. Reference fields " +
        'accept either an id or a natural key: status by {"name"}, owner by {"email"}.',
    },
    {
      key: "relationships",
      label: "Relationships",
      type: "json",
      placeholder: '[{"type": "parent", "target": {"id": "318de52f-…"}}]',
      hint: "Array of {type, target} to attach at create time. `type` is one of parent, child, " +
        "link, isBlockedBy, isBlocking.",
    },
    {
      key: "metadata",
      label: "Metadata",
      type: "json",
      placeholder: '{"source": {"system": "sfdc", "recordId": "A-1"}}',
      hint: "Stamp the external system this record came from. This is the only way to find the " +
        "entity again by its id in that system, via the source filters on List entities.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Created entity reference" }],

  async execute(input, ctx) {
    ctx.log("info", "creating Productboard entity", { type: input.type });
    const data = await new ProductboardClient(ctx).data("/entities", {
      method: "POST",
      body: {
        data: compact({
          type: input.type,
          fields: asJson<Record<string, unknown>>(input.fields, "Fields"),
          relationships: asOptionalJson<unknown[]>(input.relationships, "Relationships"),
          metadata: asOptionalJson<Record<string, unknown>>(input.metadata, "Metadata"),
        }),
      },
    });
    return { data };
  },
};

export default entityCreate;
