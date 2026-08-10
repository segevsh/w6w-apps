import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  assertValuesObject,
  ENTRY_VALUES_PARAM,
  entryValues,
  flattenValues,
  MATCHING_ATTRIBUTE_PARAM,
  MULTISELECT_MODE_PARAM,
  multiselectMethod,
  RECORD_VALUES_PARAM,
  recordValues,
  scalarOf,
  VALUE_ENVELOPE_KEYS,
  WRITE_SHAPES,
} from "../../lib/values.ts";

/** The four-field envelope every read value carries, whatever its type. */
const env = {
  active_from: "2023-04-03T15:21:06.447000000Z",
  active_until: null,
  created_by_actor: { type: "workspace-member", id: "fbe75eb0-d704-4d12-9e41-aa187e60ed73" },
};

/*
 * ── scalarOf: one case per attribute type ────────────────────────────────────
 *
 * Every example below is copied from that attribute type's own "Reading values"
 * section on docs.attio.com, read 2026-08-03. If Attio changes a read shape,
 * these are what break.
 */

Deno.test("scalarOf: text reads `value`", () => {
  assertEquals(
    scalarOf({ ...env, attribute_type: "text", value: "A long time ago…" }),
    "A long time ago…",
  );
});

Deno.test("scalarOf: number and rating read `value`", () => {
  assertEquals(scalarOf({ ...env, attribute_type: "number", value: 14 }), 14);
  assertEquals(scalarOf({ ...env, attribute_type: "rating", value: 3 }), 3);
});

Deno.test("scalarOf: checkbox reads `value`, and `false` survives", () => {
  assertEquals(scalarOf({ ...env, attribute_type: "checkbox", value: true }), true);
  // The interesting half: a falsy scalar must not be confused with "no value".
  assertEquals(scalarOf({ ...env, attribute_type: "checkbox", value: false }), false);
});

Deno.test("scalarOf: currency reads `currency_value`, not `value`", () => {
  assertEquals(
    scalarOf({
      ...env,
      attribute_type: "currency",
      currency_value: "499.00",
      currency_code: "USD",
    }),
    "499.00",
  );
});

Deno.test("scalarOf: date and timestamp read `value`", () => {
  assertEquals(scalarOf({ ...env, attribute_type: "date", value: "2023-11-24" }), "2023-11-24");
  assertEquals(
    scalarOf({ ...env, attribute_type: "timestamp", value: "2023-11-24T15:17:48.000000000Z" }),
    "2023-11-24T15:17:48.000000000Z",
  );
});

Deno.test("scalarOf: domain reads `domain`, not `root_domain`", () => {
  assertEquals(
    scalarOf({
      ...env,
      attribute_type: "domain",
      domain: "app.attio.com",
      root_domain: "attio.com",
    }),
    "app.attio.com",
  );
});

Deno.test("scalarOf: email reads the NORMALIZED address of five candidates", () => {
  assertEquals(
    scalarOf({
      ...env,
      attribute_type: "email-address",
      email_address: "person@company.com",
      original_email_address: "Person@Company.com",
      email_domain: "company.com",
      email_root_domain: "company.com",
      email_local_specifier: "person",
    }),
    // The docs say so outright: "`email_address` - the normalized form … this is
    // the one you are most likely to use".
    "person@company.com",
  );
});

Deno.test("scalarOf: phone prefers the normalized E.164 form", () => {
  assertEquals(
    scalarOf({
      ...env,
      attribute_type: "phone-number",
      original_phone_number: "+1 555 867 5309",
      normalized_phone_number: "+15558675309",
      country_code: "US",
    }),
    "+15558675309",
  );
});

Deno.test("scalarOf: personal-name reads `full_name`", () => {
  assertEquals(
    scalarOf({
      ...env,
      attribute_type: "personal-name",
      first_name: "John",
      last_name: "Smith",
      full_name: "John Smith",
    }),
    "John Smith",
  );
});

Deno.test("scalarOf: select reads `option.title`", () => {
  assertEquals(
    scalarOf({
      ...env,
      attribute_type: "select",
      option: {
        id: { option_id: "14938464-cae9-4e50-8856-0fb584844f24" },
        title: "Aerospace & Defense",
        is_archived: false,
      },
    }),
    "Aerospace & Defense",
  );
});

/**
 * The case that justifies the whole design: Attio's own status example carries
 * `"attribute_type": "select"`. A parser that switched on the discriminator
 * would look for `option` and find nothing. Keying on the property name gets it
 * right regardless.
 */
Deno.test("scalarOf: status reads `status.title` EVEN WHEN mislabelled as select", () => {
  assertEquals(
    scalarOf({
      ...env,
      attribute_type: "select", // ← verbatim from the vendor's status example
      status: {
        id: { status_id: "11f07f01-c10f-4e05-a522-33e050bc52ee" },
        title: "In Progress",
        is_archived: false,
        target_time_in_status: null,
        celebration_enabled: false,
      },
    }),
    "In Progress",
  );
});

Deno.test("scalarOf: record-reference reads `target_record_id`", () => {
  assertEquals(
    scalarOf({
      ...env,
      attribute_type: "record-reference",
      target_object: "people",
      target_record_id: "891dcbfc-9141-415d-9b2a-2238a6cc012d",
    }),
    "891dcbfc-9141-415d-9b2a-2238a6cc012d",
  );
});

Deno.test("scalarOf: actor-reference reads `referenced_actor_id`", () => {
  assertEquals(
    scalarOf({
      ...env,
      attribute_type: "actor-reference",
      referenced_actor_type: "workspace-member",
      referenced_actor_id: "fbe75eb0-d704-4d12-9e41-aa187e60ed73",
    }),
    "fbe75eb0-d704-4d12-9e41-aa187e60ed73",
  );
});

Deno.test("scalarOf: interaction reads `interacted_at`", () => {
  assertEquals(
    scalarOf({
      ...env,
      attribute_type: "interaction",
      interaction_type: "email",
      interacted_at: "2023-11-25T15:21:06.447000000Z",
      owner_actor: { type: "workspace-member", id: "50cf242c-7fa3-4cad-87d0-75b1af71c57b" },
    }),
    "2023-11-25T15:21:06.447000000Z",
  );
});

/**
 * Location has no single scalar, and inventing a formatted address string would
 * be a fabrication. It falls through to "the object minus the envelope".
 */
Deno.test("scalarOf: location keeps its structure, minus the envelope keys", () => {
  const flat = scalarOf({
    ...env,
    attribute_type: "location",
    line_1: "1 Infinite Loop",
    line_2: null,
    line_3: null,
    line_4: null,
    locality: "Cupertino",
    region: "CA",
    postcode: "95014",
    country_code: "US",
    latitude: "37.331741",
    longitude: "-122.030333",
  }) as Record<string, unknown>;

  assertEquals(flat.line_1, "1 Infinite Loop");
  assertEquals(flat.locality, "Cupertino");
  assertEquals(flat.country_code, "US");
  for (const key of VALUE_ENVELOPE_KEYS) {
    assert(!(key in flat), `location scalar leaked the envelope key ${key}`);
  }
});

/** An attribute type Attio adds tomorrow must keep its data, not become null. */
Deno.test("scalarOf: an unknown attribute type falls back to its own properties", () => {
  assertEquals(
    scalarOf({ ...env, attribute_type: "something-new", weird_property: "kept" }),
    { weird_property: "kept" },
  );
});

/*
 * ── flattenValues: the unwrapping rule ───────────────────────────────────────
 */

Deno.test("flattenValues: a single-element array unwraps to a scalar", () => {
  assertEquals(
    flattenValues({
      name: [{ ...env, attribute_type: "personal-name", full_name: "Ada Lovelace" }],
    }),
    { name: "Ada Lovelace" },
  );
});

Deno.test("flattenValues: a multi-element array stays an array of scalars", () => {
  assertEquals(
    flattenValues({
      email_addresses: [
        { ...env, attribute_type: "email-address", email_address: "a@x.com" },
        { ...env, attribute_type: "email-address", email_address: "b@x.com" },
      ],
    }),
    { email_addresses: ["a@x.com", "b@x.com"] },
  );
});

Deno.test("flattenValues: an empty array becomes null, not an empty array", () => {
  assertEquals(flattenValues({ domains: [] }), { domains: null });
});

Deno.test("flattenValues: a non-object input yields an empty map rather than throwing", () => {
  assertEquals(flattenValues(undefined), {});
  assertEquals(flattenValues(null), {});
  assertEquals(flattenValues("nope"), {});
  assertEquals(flattenValues([1, 2]), {});
});

/*
 * ── The write envelopes ──────────────────────────────────────────────────────
 */

Deno.test("recordValues: wraps in { data: { values } }", () => {
  assertEquals(
    recordValues({ name: "Smith, John", email_addresses: ["john@smith.com"] }),
    { data: { values: { name: "Smith, John", email_addresses: ["john@smith.com"] } } },
  );
});

Deno.test("recordValues: an absent payload becomes an empty values object, not undefined", () => {
  assertEquals(recordValues(undefined), { data: { values: {} } });
});

Deno.test("entryValues: wraps in { data: { …extra, entry_values } }", () => {
  assertEquals(
    entryValues({ stage: "Lead" }, { parent_object: "people", parent_record_id: "abc" }),
    { data: { parent_object: "people", parent_record_id: "abc", entry_values: { stage: "Lead" } } },
  );
});

/*
 * ── assertValuesObject: the two authoring mistakes worth catching early ──────
 */

Deno.test("assertValuesObject: rejects an array — the shape you get from pasting `data`", () => {
  const err = assertThrows(() => assertValuesObject([{ name: "x" }]), Error);
  assert(err.message.includes("must be a JSON object"), err.message);
  assert(err.message.includes("an array"), err.message);
});

Deno.test("assertValuesObject: rejects a string", () => {
  assertThrows(() => assertValuesObject("name=John"), Error);
});

Deno.test("assertValuesObject: rejects a doubly-wrapped { data: { values } }", () => {
  const err = assertThrows(
    () => assertValuesObject({ data: { values: { name: "x" } } }),
    Error,
  );
  assert(err.message.includes("doubly wrapped"), err.message);
});

Deno.test("assertValuesObject: rejects a doubly-wrapped { values } / { entry_values }", () => {
  assertThrows(() => assertValuesObject({ values: { name: "x" } }), Error);
  assertThrows(
    () => assertValuesObject({ entry_values: { stage: "x" } }, "entry_values"),
    Error,
  );
});

/**
 * The guard must not fire on a legitimate attribute that happens to be called
 * `data` or `values` alongside others — a workspace may well have one.
 */
Deno.test("assertValuesObject: allows an attribute literally named `data` beside others", () => {
  assertEquals(
    assertValuesObject({ data: "some text", name: "Smith, John" }),
    { data: "some text", name: "Smith, John" },
  );
});

Deno.test("assertValuesObject: null/undefined mean an empty map", () => {
  assertEquals(assertValuesObject(undefined), {});
  assertEquals(assertValuesObject(null), {});
});

/*
 * ── The append/overwrite fork ────────────────────────────────────────────────
 */

Deno.test("multiselectMethod: append is PATCH, overwrite is PUT", () => {
  assertEquals(multiselectMethod("append"), "PATCH");
  assertEquals(multiselectMethod("overwrite"), "PUT");
});

/**
 * The safe default. Append can add values but never delete one, so an unset or
 * unexpected value must not silently become the destructive verb.
 */
Deno.test("multiselectMethod: anything unrecognised falls back to the non-destructive PATCH", () => {
  assertEquals(multiselectMethod(undefined), "PATCH");
  assertEquals(multiselectMethod(""), "PATCH");
  assertEquals(multiselectMethod("PUT"), "PATCH");
  assertEquals(multiselectMethod("Overwrite"), "PATCH");
});

Deno.test("MULTISELECT_MODE_PARAM: required, defaults to append, offers exactly two modes", () => {
  assertEquals(MULTISELECT_MODE_PARAM.required, true);
  assertEquals(MULTISELECT_MODE_PARAM.default, "append");
  assertEquals(MULTISELECT_MODE_PARAM.options.map((o) => o.value), ["append", "overwrite"]);
  // The consequence of getting it wrong is that the call still succeeds. If that
  // warning ever falls out of the hint, the param stops earning its place.
  assert(/200/.test(MULTISELECT_MODE_PARAM.hint), MULTISELECT_MODE_PARAM.hint);
});

/*
 * ── The hints that carry the traps ───────────────────────────────────────────
 *
 * These are documentation-as-assertion. Each pins a warning whose absence would
 * cost real data, so a well-meaning edit that shortens a hint fails here first.
 */

Deno.test("RECORD_VALUES_PARAM: warns that a bare `name` string is parsed Last-then-First", () => {
  const h = RECORD_VALUES_PARAM.hint;
  assert(h.includes('"Last, First"'), h);
  assert(/FIRST name/.test(h), h);
  assert(h.includes("first_name"), h);
});

Deno.test("RECORD_VALUES_PARAM: says writes take shorthand, so reads need not be reconstructed", () => {
  assert(/shorthand/i.test(RECORD_VALUES_PARAM.hint));
});

Deno.test("ENTRY_VALUES_PARAM: says the keys are the LIST's attributes, not the record's", () => {
  assert(/list's own/i.test(ENTRY_VALUES_PARAM.hint), ENTRY_VALUES_PARAM.hint);
});

Deno.test("MATCHING_ATTRIBUTE_PARAM: required, and states the unique + inverted-multiselect rules", () => {
  assertEquals(MATCHING_ATTRIBUTE_PARAM.required, true);
  const h = MATCHING_ATTRIBUTE_PARAM.hint;
  assert(/unique/i.test(h), h);
  assert(h.includes("domains"), h);
  assert(h.includes("email_addresses"), h);
  // The half everyone misses: the matching attribute's own values are ADDED
  // while every other multiselect is replaced.
  assert(/ADDED/.test(h), h);
});

Deno.test("WRITE_SHAPES: covers all 17 attribute types Attio documents", () => {
  assertEquals(Object.keys(WRITE_SHAPES).length, 17);
  for (
    const type of [
      "text",
      "number",
      "checkbox",
      "rating",
      "currency",
      "date",
      "timestamp",
      "domain",
      "email-address",
      "phone-number",
      "personal-name",
      "location",
      "select",
      "status",
      "record-reference",
      "actor-reference",
      "interaction",
    ]
  ) {
    assert(type in WRITE_SHAPES, `missing write shape for ${type}`);
  }
  // Interaction is read-only, and saying so is the point of its entry.
  assert(/not writable/i.test(WRITE_SHAPES["interaction"]));
  // Location's whole trap is that partial objects are rejected.
  assert(/EVERY property/i.test(WRITE_SHAPES["location"]));
});
