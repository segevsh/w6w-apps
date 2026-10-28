import { assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-contact.ts";

const person = {
  etag: "%EgUBAj0DLg==",
  names: [{ givenName: "Ada" }],
};

Deno.test("update-contact: PATCHes :updateContact with updatePersonFields", async () => {
  const { ctx, calls } = mockCtx([{ body: { resourceName: "people/c1", etag: "%new" } }]);
  const result = await action.execute({
    resourceName: "people/c1",
    person,
    updatePersonFields: ["names"],
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(url.pathname, "/v1/people/c1:updateContact");
  assertEquals(url.searchParams.get("updatePersonFields"), "names");
  assertEquals(JSON.parse(calls[0].body!), person);
  assertEquals(result, { resourceName: "people/c1", etag: "%new" });
});

Deno.test("update-contact: joins and de-duplicates updatePersonFields into one mask", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    resourceName: "c1",
    person,
    updatePersonFields: ["names", "emailAddresses", "names"],
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("updatePersonFields"), "names,emailAddresses");
  assertEquals(url.searchParams.getAll("updatePersonFields").length, 1);
});

Deno.test("update-contact: updatePersonFields has NO default — an empty mask throws", () => {
  const { ctx, calls } = mockCtx([]);
  assertThrows(
    () => action.execute({ resourceName: "c1", person, updatePersonFields: [] }, ctx),
    Error,
    "updatePersonFields is required",
  );
  assertThrows(
    () => action.execute({ resourceName: "c1", person, updatePersonFields: "  " }, ctx),
    Error,
    "updatePersonFields is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("update-contact: refuses a body with no etag — Google's concurrency check", () => {
  const { ctx, calls } = mockCtx([]);
  assertThrows(
    () =>
      action.execute({
        resourceName: "c1",
        person: { names: [{ givenName: "Ada" }] },
        updatePersonFields: ["names"],
      }, ctx),
    Error,
    "must carry the etag",
  );
  assertEquals(calls.length, 0);
});

Deno.test("update-contact: accepts an etag carried on metadata.sources[]", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    resourceName: "c1",
    person: { metadata: { sources: [{ type: "CONTACT", etag: "#abc" }] }, names: [] },
    updatePersonFields: ["names"],
  }, ctx);
  assertEquals(calls.length, 1);
});

Deno.test("update-contact: personFields (the response mask) is optional and omitted when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await action.execute({ resourceName: "c1", person, updatePersonFields: ["names"] }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.has("personFields"), false);

  await action.execute({
    resourceName: "c1",
    person,
    updatePersonFields: ["names"],
    personFields: ["names", "urls"],
  }, ctx);
  assertEquals(new URL(calls[1].url).searchParams.get("personFields"), "names,urls");
});

Deno.test("update-contact: the writable mask excludes read-only fields", () => {
  const options = (action.params?.find((p) => p.key === "updatePersonFields")
    ?.options as Array<{ value: string }>).map((o) => o.value);
  for (const readOnly of ["metadata", "photos", "coverPhotos", "ageRanges", "skills"]) {
    assertEquals(options.includes(readOnly), false, `${readOnly} is not writable`);
  }
  assertEquals(options.includes("names"), true);
  assertEquals(action.idempotent, true);
});
