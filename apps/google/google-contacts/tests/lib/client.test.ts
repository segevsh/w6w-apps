import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  assertUpdateEtag,
  contactGroupName,
  contactGroupResource,
  DEFAULT_PERSON_FIELDS,
  fieldMask,
  fieldOptions,
  GoogleContactsClient,
  GROUP_FIELDS,
  mandatoryFieldMask,
  OTHER_CONTACT_FIELDS,
  PEOPLE_API,
  PERSON_FIELDS,
  personName,
  personResource,
  requiredFieldMask,
  stringList,
  UPDATE_GROUP_FIELDS,
  UPDATE_PERSON_FIELDS,
} from "../../lib/client.ts";

// ------------------------------------------------------------------ client --

Deno.test("client: resolves a relative path against the People API v1 base", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new GoogleContactsClient(ctx).request("/people/me");
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://people.googleapis.com");
  assertEquals(url.pathname, "/v1/people/me");
  assertEquals(PEOPLE_API, "https://people.googleapis.com/v1");
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new GoogleContactsClient(ctx).request("/x", {
    query: { a: "kept", b: undefined, c: null, d: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
});

Deno.test("client: emits an array query value as a REPEATED param, not comma-joined", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new GoogleContactsClient(ctx).request("/people:batchGet", {
    query: { resourceNames: ["people/a", "people/b"], sources: [] },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.getAll("resourceNames"), ["people/a", "people/b"]);
  // An empty array contributes nothing at all.
  assertEquals(url.searchParams.has("sources"), false);
});

Deno.test("client: JSON body sets content-type and drops undefined keys", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await new GoogleContactsClient(ctx).request("/contactGroups", {
    method: "POST",
    body: { contactGroup: { name: "Team" }, readGroupFields: undefined },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"contactGroup":{"name":"Team"}}');
});

Deno.test("client: 204 and an empty 200 body both return undefined", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }, { status: 200, body: "" }]);
  const client = new GoogleContactsClient(ctx);
  assertEquals(await client.request("/people/c1:deleteContact", { method: "DELETE" }), undefined);
  assertEquals(await client.request("/contactGroups/x", { method: "DELETE" }), undefined);
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 400, statusText: "Bad Request", body: '{"error":{"message":"personFields"}}' },
  ]);
  const err = await assertRejects(
    () => new GoogleContactsClient(ctx).request("/people/me"),
    Error,
    "Google People API 400",
  );
  assertEquals(err.message.includes("/v1/people/me"), true);
  assertEquals(err.message.includes("personFields"), true);
});

// ------------------------------------------------------------- field masks --

Deno.test("fieldMask: joins an array with commas", () => {
  assertEquals(fieldMask(["names", "emailAddresses"]), "names,emailAddresses");
});

Deno.test("fieldMask: accepts a comma-separated string and trims whitespace", () => {
  assertEquals(fieldMask(" names , emailAddresses "), "names,emailAddresses");
});

Deno.test("fieldMask: splits comma-bearing array entries (mixed input from expressions)", () => {
  assertEquals(
    fieldMask(["names,emailAddresses", "phoneNumbers"]),
    "names,emailAddresses,phoneNumbers",
  );
});

Deno.test("fieldMask: de-duplicates while preserving first-seen order", () => {
  assertEquals(fieldMask(["phoneNumbers", "names", "phoneNumbers", "names"]), "phoneNumbers,names");
});

Deno.test("fieldMask: returns undefined for nothing usable, so the param is omitted", () => {
  assertEquals(fieldMask(undefined), undefined);
  assertEquals(fieldMask(null), undefined);
  assertEquals(fieldMask(""), undefined);
  assertEquals(fieldMask("   "), undefined);
  assertEquals(fieldMask([]), undefined);
  assertEquals(fieldMask([" ", ",", ""]), undefined);
});

Deno.test("requiredFieldMask: falls back to the default when nothing usable is given", () => {
  assertEquals(requiredFieldMask(undefined), DEFAULT_PERSON_FIELDS);
  assertEquals(requiredFieldMask([]), DEFAULT_PERSON_FIELDS);
  assertEquals(requiredFieldMask("", "names"), "names");
  assertEquals(requiredFieldMask(["birthdays"]), "birthdays");
  assertEquals(DEFAULT_PERSON_FIELDS, "names,emailAddresses,phoneNumbers");
});

Deno.test("mandatoryFieldMask: throws rather than guessing — a wrong mask clears data", () => {
  assertEquals(mandatoryFieldMask(["names"], "updatePersonFields"), "names");
  const err = assertThrows(
    () => mandatoryFieldMask([], "updatePersonFields"),
    Error,
    "updatePersonFields is required",
  );
  assertEquals(err.message.includes("clears"), true);
  assertThrows(() => mandatoryFieldMask(undefined, "updatePersonFields"), Error);
  assertThrows(() => mandatoryFieldMask("  ", "updatePersonFields"), Error);
});

Deno.test("field vocabularies match the documented People API enums", () => {
  assertEquals(PERSON_FIELDS.length, 29);
  // updatePersonFields is the writable subset — the read-only fields are absent.
  for (const readOnly of ["ageRanges", "coverPhotos", "metadata", "photos", "skills"]) {
    assertEquals(PERSON_FIELDS.includes(readOnly as never), true);
    assertEquals(UPDATE_PERSON_FIELDS.includes(readOnly as never), false);
  }
  assertEquals(UPDATE_PERSON_FIELDS.length, 24);
  assertEquals([...OTHER_CONTACT_FIELDS], [
    "emailAddresses",
    "metadata",
    "names",
    "phoneNumbers",
    "photos",
  ]);
  assertEquals([...GROUP_FIELDS], ["clientData", "groupType", "memberCount", "metadata", "name"]);
  assertEquals([...UPDATE_GROUP_FIELDS], ["clientData", "name"]);
});

Deno.test("fieldOptions: turns a vocabulary into Param options", () => {
  assertEquals(fieldOptions(["names", "urls"]), [
    { value: "names", label: "names" },
    { value: "urls", label: "urls" },
  ]);
});

// --------------------------------------------------------- resource  names --

Deno.test("stringList: splits on commas and newlines, trims, drops empties", () => {
  assertEquals(stringList("people/a, people/b\npeople/c"), ["people/a", "people/b", "people/c"]);
  assertEquals(stringList(["people/a , people/b", "people/c"]), [
    "people/a",
    "people/b",
    "people/c",
  ]);
  assertEquals(stringList(undefined), []);
  assertEquals(stringList(""), []);
  assertEquals(stringList([" ", ","]), []);
});

Deno.test("personName: prefixes a bare id and leaves a full resource name alone", () => {
  assertEquals(personName("c123"), "people/c123");
  assertEquals(personName("people/c123"), "people/c123");
  assertEquals(personName(" people/me "), "people/me");
});

Deno.test("personName: does NOT percent-encode — query values are encoded downstream", () => {
  assertEquals(personName("c1/2"), "people/c1/2");
});

Deno.test("personResource: encodes only the id, keeping the prefix slash literal", () => {
  assertEquals(personResource("people/c123"), "people/c123");
  assertEquals(personResource("c1/2"), "people/c1%2F2");
});

Deno.test("personResource / contactGroupResource: reject an empty identifier", () => {
  assertThrows(() => personResource(""), Error, "resourceName is required");
  assertThrows(() => personResource("people/"), Error, "resourceName is required");
  assertThrows(() => contactGroupResource(undefined), Error, "resourceName is required");
});

Deno.test("contactGroupName / contactGroupResource: prefix and encode the group id", () => {
  assertEquals(contactGroupName("myContacts"), "contactGroups/myContacts");
  assertEquals(contactGroupName("contactGroups/1a2b"), "contactGroups/1a2b");
  assertEquals(contactGroupResource("1a/2b"), "contactGroups/1a%2F2b");
});

// -------------------------------------------------------------------- etag --

Deno.test("assertUpdateEtag: accepts a top-level etag", () => {
  assertUpdateEtag({ etag: "%EgUB" });
});

Deno.test("assertUpdateEtag: accepts a metadata.sources[] etag", () => {
  assertUpdateEtag({ metadata: { sources: [{ type: "CONTACT", etag: "#abc" }] } });
});

Deno.test("assertUpdateEtag: rejects a body with no etag anywhere", () => {
  const err = assertThrows(
    () => assertUpdateEtag({ names: [{ givenName: "Ada" }] }),
    Error,
    "must carry the etag",
  );
  assertEquals(err.message.includes("get-person"), true);
});

Deno.test("assertUpdateEtag: rejects empty-string etags and non-objects", () => {
  assertThrows(() => assertUpdateEtag({ etag: "" }), Error, "must carry the etag");
  assertThrows(
    () => assertUpdateEtag({ metadata: { sources: [{ etag: "" }] } }),
    Error,
    "must carry the etag",
  );
  assertThrows(() => assertUpdateEtag(null), Error, "must be an object");
  assertThrows(() => assertUpdateEtag("nope"), Error, "must be an object");
});
