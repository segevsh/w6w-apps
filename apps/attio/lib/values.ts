/**
 * Attribute values — the part of Attio that will silently eat your data if you
 * get it wrong, and the reason this file exists.
 *
 * ## The write envelope
 *
 * Every record write nests its payload twice:
 *
 *     { "data": { "values": { "<attribute slug or UUID>": <value> } } }
 *
 * and every list-entry write uses `entry_values` in place of `values`:
 *
 *     { "data": { "parent_object": "people",
 *                 "parent_record_id": "…",
 *                 "entry_values": { … } } }
 *
 * Both key names are `required` in the OpenAPI request schemas, so a payload
 * missing either is a 400, not a silent no-op. `recordValues()` and
 * `entryValues()` below build them, and `assertValuesObject()` catches the two
 * authoring mistakes that would otherwise reach the wire as nonsense: passing an
 * array, and passing an already-wrapped `{"data": {"values": …}}` a second time.
 *
 * ## Writes are FORGIVING. Reads are not. They are not the same shape.
 *
 * This is the single most important thing on this page, and it inverts the
 * assumption most integrations start with.
 *
 * **Reading**, every attribute value is an array of typed objects, even when the
 * attribute holds exactly one value, and every object carries a four-field
 * envelope (`active_from`, `active_until`, `created_by_actor`, `attribute_type`)
 * around its type-specific properties:
 *
 *     "email_addresses": [{ "active_from": "…", "active_until": null,
 *                           "created_by_actor": {…}, "attribute_type": "email-address",
 *                           "email_address": "r.hamming@bell-labs.com",
 *                           "original_email_address": "…", "email_domain": "…",
 *                           "email_root_domain": "…", "email_local_specifier": "…" }]
 *
 * **Writing**, Attio accepts shorthand. The attribute-type documentation says so
 * for every one of the 17 types: "When writing to multi-select attributes, you
 * must always wrap values in an array. Single-select attributes accept unwrapped
 * data." So all three of these are valid and equivalent:
 *
 *     { "description": "A long time ago…" }                    // bare scalar
 *     { "description": ["A long time ago…"] }                  // wrapped
 *     { "description": [{ "value": "A long time ago…" }] }     // object form
 *
 * You do **not** need to reconstruct the read shape to write. Trying to — for
 * instance by round-tripping a record you just read, envelope fields and all —
 * is what actually breaks, because `active_from` and friends are not writable.
 *
 * `WRITE_SHAPES` below is the per-type write cheat-sheet, transcribed from each
 * type's "Writing values" section, and it is surfaced verbatim in the hint on
 * every values param so it is readable at the form rather than in a doc.
 *
 * ## The four traps that return 200 and write the wrong thing
 *
 * These succeed. That is what makes them expensive.
 *
 * 1. **`name` as a plain string is parsed as `"Last, First"`.** From the
 *    (Personal) name page: "the string must match format 'Last name(s), First
 *    name(s)'. Text without a comma is interpreted as solely comprising the
 *    first name." So `{"name": "John Smith"}` creates a person whose *first
 *    name* is the whole string "John Smith" and whose last name is empty. It
 *    returns 201. Use the object form — `{"first_name", "last_name",
 *    "full_name"}`, all three required — or write `"Smith, John"`.
 *
 * 2. **PATCH appends to multiselects; PUT overwrites.** Two different HTTP verbs
 *    on the same URL, differing only in that: "If the update payload includes
 *    multiselect attributes, the values supplied will be created and prepended
 *    to the list of values that already exist" (PATCH) versus "will
 *    overwrite/remove the list of values that already exist" (PUT). Sending
 *    "the tags are now exactly [A]" as a PATCH leaves the old tags in place and
 *    returns 200. Update Record and Update Entry make this an explicit,
 *    required-by-default choice rather than a hidden verb.
 *
 * 3. **A location object must name every property, including the nulls.** "When
 *    using the object syntax, we require that updates to a location attribute
 *    must specify a value for every attribute, even if it is `null`" — all ten
 *    of `line_1`…`line_4`, `locality`, `region`, `postcode`, `country_code`,
 *    `latitude`, `longitude`.
 *
 * 4. **Upsert matches on ONE attribute, and it must be unique.** The
 *    `matching_attribute` query parameter is `required: true` on every upsert
 *    path. For companies the docs note "`domains` is the only unique attribute";
 *    for people it is `email_addresses`. Pointing it at a non-unique attribute
 *    is an error, not a fuzzy match.
 *
 * ## Why the flattener keys on PROPERTY NAMES, not on `attribute_type`
 *
 * `flattenValues()` turns the read shape into plain scalars, so a downstream
 * step can say `values.name` instead of `values.name[0].full_name`. The obvious
 * implementation switches on `attribute_type`. It is the wrong one, and the
 * vendor's own documentation is the evidence: two of the seventeen "Reading
 * values" examples carry the wrong `attribute_type` (the **status** example is
 * labelled `"attribute_type": "select"`, and the **timestamp** example is
 * labelled `"attribute_type": "date"` — both read 2026-08-03). If Attio's
 * hand-written examples disagree with their own discriminator, a parser that
 * trusts it will mis-read real payloads too.
 *
 * The property names, by contrast, are unambiguous and disjoint: only a currency
 * value has `currency_value`, only a select has `option`, only a status has
 * `status`. `SCALAR_KEYS` below is that mapping, one entry per attribute type,
 * each taken from the type's own "Reading values" section.
 */

/** The four envelope fields present on every read value, whatever its type. */
export const VALUE_ENVELOPE_KEYS = [
  "active_from",
  "active_until",
  "created_by_actor",
  "attribute_type",
] as const;

/**
 * Per-type write cheat-sheet, from each attribute type's "Writing values"
 * section. Surfaced in the values param hint; pinned by `tests/lib/values.test.ts`
 * so it cannot rot silently.
 */
export const WRITE_SHAPES: Record<string, string> = {
  "text": '`"some text"` — or `[{"value": "some text"}]`',
  "number": '`3.1415` — or `[{"value": 3.1415}]`',
  "checkbox": '`true` / `"true"` — or `[{"value": true}]`. Single-select only',
  "rating": '`4` (0–5) — or `[{"value": 4}]`',
  "currency": '`4.99` or `"4.99"` — or `[{"currency_value": "399.00"}]`. `currency_code` is ' +
    "inherited from the attribute and cannot be set",
  "date": '`"2004-07-29"` — ISO 8601; any time/timezone component is trimmed to a calendar date',
  "timestamp": '`"2019-01-17T15:17:48.000000000Z"` — partial values are coerced, UTC assumed',
  "domain": '`["app.attio.com"]` — multi-select, so ALWAYS an array. `root_domain` is inferred',
  "email-address": '`["a@example.com"]` — multi-select, so ALWAYS an array',
  "phone-number": '`["+447777777777"]` — must carry a `+` country prefix, or use ' +
    '`[{"original_phone_number": "…", "country_code": "GB"}]`. Validated against E.164',
  "personal-name": '`{"first_name": "John", "last_name": "Smith", "full_name": "John Smith"}` — ' +
    'ALL THREE required. A bare string is read as `"Last, First"`',
  "location": '`"1 Infinite Loop, Cupertino, CA, 95014, US"` (parsed), or an object that names ' +
    "EVERY property including the nulls",
  "select": '`["3D Printing"]` — the option *title*. Unknown titles error, they do not create ' +
    "options",
  "status": '`"Lead"` — the status *title*. Unknown titles error, they do not create statuses',
  "record-reference": '`["company.com"]` / `["a@example.com"]` for a single-standard-object ' +
    'reference, or `[{"target_object": "people", "target_record_id": "…"}]`',
  "actor-reference": '`["alice@attio.com"]` — only `workspace-member` actors can be written',
  "interaction": "**not writable** — created by Attio only",
};

/**
 * Read-shape scalar extraction, one rule per attribute type, in probe order.
 *
 * Order matters where a type carries more than one candidate: a phone number has
 * both `original_phone_number` and `normalized_phone_number`, and the normalized
 * form is the one to key on downstream; an email has five properties and the
 * docs name the winner outright — "`email_address` - the normalized form of the
 * email address, this is the one you are most likely to use".
 *
 * `value` is probed first because it is shared by five types (text, number,
 * date, timestamp, rating, checkbox) and is never present on the others.
 */
type ValueRecord = Record<string, unknown>;

const SCALAR_KEYS: Array<{ key: string; pick: (v: ValueRecord) => unknown }> = [
  // text · number · date · timestamp · rating · checkbox
  { key: "value", pick: (v) => v.value },
  // select — `{ option: { id, title, is_archived } }`
  { key: "option", pick: (v) => (v.option as ValueRecord | undefined)?.title },
  // status — `{ status: { id, title, is_archived, … } }`
  { key: "status", pick: (v) => (v.status as ValueRecord | undefined)?.title },
  // currency — `currency_value` plus an attribute-level `currency_code`
  { key: "currency_value", pick: (v) => v.currency_value },
  // email-address — five properties; the normalized one is the useful one
  { key: "email_address", pick: (v) => v.email_address },
  // phone-number — prefer the normalized E.164 form
  {
    key: "normalized_phone_number",
    pick: (v) => v.normalized_phone_number ?? v.original_phone_number,
  },
  { key: "original_phone_number", pick: (v) => v.original_phone_number },
  // domain — `domain` is the full domain, `root_domain` the registrable part
  { key: "domain", pick: (v) => v.domain },
  // personal-name — first_name / last_name / full_name are all present on read
  { key: "full_name", pick: (v) => v.full_name },
  // record-reference — `{ target_object, target_record_id }`
  { key: "target_record_id", pick: (v) => v.target_record_id },
  // actor-reference — `{ referenced_actor_type, referenced_actor_id }`
  { key: "referenced_actor_id", pick: (v) => v.referenced_actor_id },
  // interaction — `{ interaction_type, interacted_at, owner_actor }`
  { key: "interacted_at", pick: (v) => v.interacted_at },
];

/**
 * Reduce one read value object to its most useful scalar.
 *
 * Falls back to the object minus the four envelope fields, which is exactly what
 * a **location** should produce — it genuinely has no single scalar, and
 * inventing a formatted address string would be a fabrication. Any attribute
 * type Attio adds after this was written also lands here, keeping its data
 * rather than becoming `null`.
 */
export function scalarOf(value: unknown): unknown {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return value;
  const v = value as ValueRecord;

  for (const rule of SCALAR_KEYS) {
    if (rule.key in v) return rule.pick(v);
  }

  const rest: ValueRecord = {};
  for (const [k, val] of Object.entries(v)) {
    if ((VALUE_ENVELOPE_KEYS as readonly string[]).includes(k)) continue;
    rest[k] = val;
  }
  return Object.keys(rest).length > 0 ? rest : null;
}

/**
 * Turn a read `values` map into plain scalars.
 *
 * Unwrapping rule, stated because it is a judgement call and not a fact about
 * the API: an **empty** array becomes `null`, a **single-element** array becomes
 * that element's scalar, and a longer array becomes an array of scalars. The
 * alternative — always returning an array — is more truthful about the wire
 * format and much worse to use, since single-valued attributes are the common
 * case and `{{record.values_flat.name}}` is what a workflow author wants to
 * write.
 *
 * The flattened map is always emitted **alongside** the raw `values`, never
 * instead of it, so nothing this function decides is lossy: the envelope
 * timestamps, the `original_email_address`, the select option's UUID and the
 * record reference's `target_object` are all still there in `values`.
 */
export function flattenValues(values: unknown): Record<string, unknown> {
  if (!values || typeof values !== "object" || Array.isArray(values)) return {};
  const out: Record<string, unknown> = {};
  for (const [slug, raw] of Object.entries(values as ValueRecord)) {
    if (!Array.isArray(raw)) {
      out[slug] = scalarOf(raw);
      continue;
    }
    if (raw.length === 0) {
      out[slug] = null;
    } else if (raw.length === 1) {
      out[slug] = scalarOf(raw[0]);
    } else {
      out[slug] = raw.map(scalarOf);
    }
  }
  return out;
}

/**
 * Attach a flattened view to a record or entry, without disturbing it.
 *
 * Records nest their values under `values`, list entries under `entry_values`;
 * both are handled so read actions on either side get the same convenience.
 */
export function withFlatValues(resource: unknown): unknown {
  if (!resource || typeof resource !== "object" || Array.isArray(resource)) return resource;
  const r = resource as Record<string, unknown>;
  const source = r.values ?? r.entry_values;
  if (!source) return resource;
  return { ...r, values_flat: flattenValues(source) };
}

/**
 * Validate a user-supplied values payload before it becomes a request body.
 *
 * Two failures are worth catching here rather than at the API, because Attio's
 * own message for them is generic and the cause is not:
 *
 *  - an **array** instead of an object, which is what you get by pasting the
 *    `data` array out of a List Records response;
 *  - an already-**wrapped** `{"data": {"values": …}}`, which is what you get by
 *    pasting a curl example straight from the reference page.
 *
 * Both would otherwise produce a request that is well-formed JSON and complete
 * nonsense. The thrown message names the mistake and shows the shape wanted.
 */
export function assertValuesObject(
  values: unknown,
  field: "values" | "entry_values" = "values",
): Record<string, unknown> {
  if (values === undefined || values === null) return {};
  if (typeof values !== "object" || Array.isArray(values)) {
    throw new Error(
      `Attio ${field} must be a JSON object keyed by attribute slug or UUID, e.g. ` +
        `{"name": "Smith, John", "email_addresses": ["john@smith.com"]} — got ` +
        `${Array.isArray(values) ? "an array" : typeof values}.`,
    );
  }
  const v = values as Record<string, unknown>;
  if ("data" in v && Object.keys(v).length === 1) {
    throw new Error(
      `Attio ${field} looks doubly wrapped: pass just the attribute map, not the whole ` +
        `{"data": {"${field}": …}} request body. This action adds the envelope for you.`,
    );
  }
  if (field in v && Object.keys(v).length === 1 && typeof v[field] === "object") {
    throw new Error(
      `Attio ${field} looks doubly wrapped: pass just the attribute map, not ` +
        `{"${field}": …}. This action adds the envelope for you.`,
    );
  }
  return v;
}

/** Build the `{ data: { values } }` body a record write takes. */
export function recordValues(values: unknown): { data: { values: Record<string, unknown> } } {
  return { data: { values: assertValuesObject(values, "values") } };
}

/** Build the `{ data: { entry_values, … } }` body a list-entry write takes. */
export function entryValues(
  values: unknown,
  extra: Record<string, unknown> = {},
): { data: Record<string, unknown> } {
  return { data: { ...extra, entry_values: assertValuesObject(values, "entry_values") } };
}

/** The write cheat-sheet, rendered as a markdown list for a param hint. */
function writeShapeHint(): string {
  return Object.entries(WRITE_SHAPES).map(([type, shape]) => `\`${type}\` — ${shape}`).join("; ");
}

const VALUES_HINT_HEAD =
  "JSON object keyed by attribute `api_slug` **or** UUID (List Attributes gives you both). " +
  "Writes accept shorthand — a bare scalar for a single-select attribute, an array for a " +
  "multi-select one — so you do **not** reconstruct the read shape. " +
  '⚠ A bare `name` string is parsed as `"Last, First"`: `"John Smith"` sets the FIRST name ' +
  'to the whole string. Use `{"first_name", "last_name", "full_name"}` (all three) instead. ' +
  "Per-type shapes: ";

/** The `values` param every record write reuses. */
export const RECORD_VALUES_PARAM = {
  key: "values",
  label: "Attribute values",
  type: "json" as const,
  required: true,
  hint: VALUES_HINT_HEAD + writeShapeHint() + ".",
};

/** The `entry_values` param every list-entry write reuses. */
export const ENTRY_VALUES_PARAM = {
  key: "entryValues",
  label: "Entry attribute values",
  type: "json" as const,
  required: true,
  hint: "JSON object keyed by the **list's own** attribute slugs or UUIDs — the entry's values, " +
    "not the parent record's. A list can carry attributes the object does not (a stage on a " +
    "Sales list, say). Same shorthand rules as record values: " + writeShapeHint() + ".",
};

/**
 * The append-vs-overwrite choice, made explicit.
 *
 * Attio expresses it as PATCH versus PUT on one URL. Exposing that as a verb
 * would hide the only thing about the call that can destroy data, so it is a
 * param with no silent default — see trap 2 in the module comment.
 */
export const MULTISELECT_MODE_PARAM = {
  key: "multiselect",
  label: "Multiselect handling",
  type: "select" as const,
  required: true,
  default: "append",
  options: [
    {
      value: "append",
      label: "Append (PATCH) — add values, keep existing ones",
      description:
        "New values are prepended to whatever is already there. Nothing is ever removed.",
    },
    {
      value: "overwrite",
      label: "Overwrite (PUT) — the supplied values become the complete set",
      description:
        "Values you do not supply are REMOVED. This is the only way to clear a multiselect.",
    },
  ],
  hint:
    "Only affects multi-select attributes (tags, domains, email addresses, phone numbers, …); " +
    "single-value attributes are replaced either way. **Append** cannot remove a value, so " +
    'sending "the tags are now exactly [A]" as an append silently leaves the old tags in place ' +
    "and still returns 200. Pick **Overwrite** when the payload is the complete intended set.",
};

/** Map the `multiselect` choice onto the HTTP verb Attio uses to express it. */
export function multiselectMethod(mode: string | undefined): "PATCH" | "PUT" {
  return mode === "overwrite" ? "PUT" : "PATCH";
}

/**
 * The `matching_attribute` param every upsert reuses.
 *
 * `required: true` mirrors the spec, where the query parameter is required on
 * every upsert path — there is no "match on anything sensible" mode.
 */
export const MATCHING_ATTRIBUTE_PARAM = {
  key: "matchingAttribute",
  label: "Matching attribute",
  type: "string" as const,
  required: true,
  placeholder: "email_addresses",
  hint: "Slug or UUID of the attribute used to find an existing record. **It must be a unique " +
    "attribute.** For companies, Attio notes `domains` is the only unique one; for people it is " +
    "`email_addresses`. If the matching attribute is itself multi-select, its values are ADDED " +
    "and never deleted; every other multi-select attribute in the payload is set to exactly what " +
    "you supply.",
};
