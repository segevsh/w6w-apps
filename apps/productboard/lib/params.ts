import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments and option lists for the Productboard actions.
 *
 * Every enum here is copied from Productboard's v2 OpenAPI documents (fetched
 * 2026-08-11 from `developer.productboard.com/openapi/*.yaml`), not inferred.
 * Where a vocabulary is workspace-dependent rather than fixed, it is exposed as
 * a free-text field with a pointer to the `/configurations` endpoint that
 * enumerates it, instead of a `select` that would go stale.
 */

/**
 * `EntityType` — the eleven core entity types the unified `/entities` endpoint
 * covers.
 *
 * The vendor's own caveat is copied into the hint: *"The exact types available
 * may vary based on the configuration of the workspace."* This is a filter
 * vocabulary, not a promise about a given workspace.
 */
export const entityTypeOptions = [
  { value: "product", label: "Product" },
  { value: "component", label: "Component" },
  { value: "feature", label: "Feature" },
  { value: "subfeature", label: "Subfeature" },
  { value: "initiative", label: "Initiative" },
  { value: "objective", label: "Objective" },
  { value: "keyResult", label: "Key result" },
  { value: "release", label: "Release" },
  { value: "releaseGroup", label: "Release group" },
  { value: "company", label: "Company" },
  { value: "user", label: "User (customer)" },
];

/** `EntityRelationshipType`. `link` is the vendor's documented default. */
export const entityRelationshipTypeOptions = [
  { value: "parent", label: "Parent — this entity is a child of the target" },
  { value: "child", label: "Child — this entity contains the target" },
  { value: "link", label: "Link — generic, bidirectional, no semantics (default)" },
  { value: "isBlockedBy", label: "Is blocked by — cannot proceed until the target is resolved" },
  { value: "isBlocking", label: "Is blocking — prevents progress on the target" },
];

/**
 * `NoteTypeInput`.
 *
 * The enum carries six members but only three concepts: Productboard accepts a
 * short and a long spelling of each (`simple`/`textNote`,
 * `conversation`/`conversationNote`, `opportunity`/`opportunityNote`). The long
 * forms are the ones the documentation and the response `type` field use, so
 * those are offered first, with the aliases kept because a workspace's existing
 * automation may already send them.
 */
export const noteTypeOptions = [
  { value: "textNote", label: "Text note — freeform feedback or an internal insight" },
  { value: "conversationNote", label: "Conversation note — multi-part threaded content" },
  { value: "opportunityNote", label: "Opportunity note — read-only via the API" },
  { value: "simple", label: "simple — alias of textNote" },
  { value: "conversation", label: "conversation — alias of conversationNote" },
  { value: "opportunity", label: "opportunity — alias of opportunityNote" },
];

/** The two relationship types a note supports. */
export const noteRelationshipTypeOptions = [
  { value: "customer", label: "Customer — the user or company this feedback came from" },
  { value: "link", label: "Link — a product hierarchy entity this note is about" },
];

/** The entity types a note's `link` relationship may target. */
export const noteLinkTargetTypeOptions = [
  { value: "feature", label: "Feature" },
  { value: "subfeature", label: "Subfeature" },
  { value: "product", label: "Product" },
  { value: "component", label: "Component" },
];

/** `roles[]` on `GET /members`. */
export const memberRoleOptions = [
  { value: "admin", label: "Admin" },
  { value: "maker", label: "Maker" },
  { value: "viewer", label: "Viewer" },
  { value: "contributor", label: "Contributor" },
];

/** `WebhookEventType` — the 26 events a v2 subscription may name. */
export const webhookEventOptions = [
  { value: "feature.created", label: "Feature created" },
  { value: "feature.updated", label: "Feature updated" },
  { value: "feature.deleted", label: "Feature deleted" },
  { value: "component.created", label: "Component created" },
  { value: "component.updated", label: "Component updated" },
  { value: "product.created", label: "Product created" },
  { value: "product.updated", label: "Product updated" },
  { value: "release.created", label: "Release created" },
  { value: "release.updated", label: "Release updated" },
  { value: "release.deleted", label: "Release deleted" },
  { value: "feature-release-assignment.updated", label: "Feature/release assignment updated" },
  { value: "hierarchy-entity.custom-field-value.updated", label: "Custom field value updated" },
  { value: "note.created", label: "Note created" },
  { value: "note.updated", label: "Note updated" },
  { value: "note.deleted", label: "Note deleted" },
  { value: "insight.created", label: "Insight created" },
  { value: "insight.deleted", label: "Insight deleted" },
  { value: "key-result.created", label: "Key result created" },
  { value: "key-result.updated", label: "Key result updated" },
  { value: "key-result.deleted", label: "Key result deleted" },
  { value: "objective.created", label: "Objective created" },
  { value: "objective.updated", label: "Objective updated" },
  { value: "objective.deleted", label: "Objective deleted" },
  { value: "initiative.created", label: "Initiative created" },
  { value: "initiative.updated", label: "Initiative updated" },
  { value: "initiative.deleted", label: "Initiative deleted" },
];

/**
 * The vendor's own validation pattern for a webhook notification URL, copied
 * verbatim from `WebhookNotificationConfig.url.pattern`.
 *
 * It lives here rather than at the call site for the same reason `API_BASE`
 * lives in `lib/client.ts`: URL literals belong to the vendor-constant layer, so
 * `tests/index.test.ts` can keep asserting that **no file under `actions/`
 * contains an absolute URL at all**. That guard is what stops an action ever
 * being pointed at a host the manifest never allowlisted, and it is only worth
 * having while it has no exceptions.
 */
export const HTTPS_URL_PATTERN = "^https://.+";

/** `ConnectionStateName` on a plugin integration connection. */
export const connectionStateOptions = [
  { value: "connected", label: "Connected" },
  { value: "error", label: "Error" },
  { value: "progress", label: "In progress" },
  { value: "initial", label: "Initial — no connection" },
];

/**
 * The cursor every v2 list endpoint pages with.
 *
 * **There is no `limit` and no `offset` anywhere in v2** — the API decides the
 * page size and hands back a cursor, and the vendor's guidance is to treat the
 * cursor as an opaque string. Each list action returns `nextPageCursor` (lifted
 * out of `links.next`) so the next step can be fed this parameter directly.
 *
 * `GET /notes/{id}/relationships` is the single exception that also accepts a
 * `limit`; it declares it at its own call site.
 */
export const pageCursorParam: Param = {
  key: "pageCursor",
  label: "Page cursor",
  type: "string",
  hint:
    "Leave empty for the first page. Then pass the `nextPageCursor` this action returned to get " +
    "the next one; when it comes back empty you have reached the end. Treat the value as opaque.",
};

/**
 * `fields[]` — the v2 response-shaping parameter.
 *
 * Worth reading before ignoring it: **omitting it does not mean "everything"**.
 * The vendor documents the default as *"returns only fields with non-empty
 * values"*, so a field that happens to be `null` on this record simply will not
 * appear in the response, and a downstream step keying off its presence will
 * misread that as "the field does not exist". `fields[]=all` is the way to get a
 * stable shape.
 */
export const fieldsParam: Param = {
  key: "fields",
  label: "Fields",
  type: "string",
  placeholder: "name,status,owner",
  hint:
    "Comma-separated. Empty returns only fields that currently have a value — so a null field is " +
    "absent rather than null. Use `all` for every field including the empty ones, or name the " +
    "ones you need to cut the payload.",
};

/** The same parameter under its bracketed spelling, used by the search endpoints. */
export const searchFieldsParam: Param = {
  ...fieldsParam,
  key: "fields",
  hint: fieldsParam.hint,
};

/** A required entity id. */
export const entityIdParam: Param = {
  key: "entityId",
  label: "Entity ID",
  type: "string",
  required: true,
  placeholder: "195a1cb2-728f-4be8-900f-aebbd84d7944",
  hint: "UUID of the product, component, feature, initiative, objective, release, company or " +
    "user. Take it from the `id` field of a List entities result.",
};

/** A required note id. */
export const noteIdParam: Param = {
  key: "noteId",
  label: "Note ID",
  type: "string",
  required: true,
  placeholder: "123e4567-e89b-12d3-a456-426614174000",
  hint: "UUID from the `id` field of a List notes result.",
};

/**
 * The `owner[...]` / `creator[...]` / `status[...]` bracketed filters.
 *
 * Productboard spells these as literal bracketed query keys
 * (`owner[email]=jane@example.com`), not as a nested object, so they are flat
 * params here and are sent verbatim.
 */
export function bracketedFilterParams(
  prefix: string,
  label: string,
  includeName = false,
): Param[] {
  const out: Param[] = [
    {
      key: `${prefix}Id`,
      label: `${label} ID`,
      type: "string",
      hint: `Sent as \`${prefix}[id]\`.`,
    },
  ];
  if (includeName) {
    out.push({
      key: `${prefix}Name`,
      label: `${label} name`,
      type: "string",
      hint: `Sent as \`${prefix}[name]\`.`,
    });
  } else {
    out.push({
      key: `${prefix}Email`,
      label: `${label} email`,
      type: "string",
      hint: `Sent as \`${prefix}[email]\`.`,
    });
  }
  return out;
}

/**
 * The `metadata[source][...]` filter pair, shared by entities and notes.
 *
 * This is how a record created by another system is found again: the creating
 * integration stamps `metadata.source.system` / `metadata.source.recordId`, and
 * these two filters are the only way to look a record up by its identity in
 * that other system.
 */
export const sourceFilterParams: Param[] = [
  {
    key: "sourceSystem",
    label: "Source system",
    type: "string",
    placeholder: "sfdc",
    hint: "Sent as `metadata[source][system]`. Matches records stamped by that external system.",
  },
  {
    key: "sourceRecordId",
    label: "Source record ID",
    type: "string",
    placeholder: "A-1",
    hint: "Sent as `metadata[source][recordId]`. The record's id in the external system.",
  },
];

/** The standard list output columns, identical across every list action. */
export const listOutput = [
  { key: "items", type: "array" as const, label: "Results" },
  { key: "nextPageCursor", type: "string" as const, label: "Cursor for the next page" },
  { key: "hasMore", type: "boolean" as const, label: "Another page is available" },
];
