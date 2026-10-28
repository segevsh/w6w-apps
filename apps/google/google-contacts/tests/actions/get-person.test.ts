import { assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-person.ts";

Deno.test("get-person: GETs the resource with the required personFields", async () => {
  const { ctx, calls } = mockCtx([{ body: { resourceName: "people/c1", etag: "%Eg" } }]);
  const result = await action.execute({ resourceName: "people/c1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/people/c1");
  assertEquals(url.searchParams.get("personFields"), "names,emailAddresses,phoneNumbers");
  assertEquals(result, { resourceName: "people/c1", etag: "%Eg" });
});

Deno.test("get-person: `people/me` resolves to the profile path", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ resourceName: "people/me", personFields: "metadata,names" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/people/me");
  assertEquals(url.searchParams.get("personFields"), "metadata,names");
});

Deno.test("get-person: de-duplicates a mask supplied twice", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ resourceName: "c1", personFields: ["names", "names", "metadata"] }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("personFields"), "names,metadata");
});

Deno.test("get-person: forwards sources as repeated params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ resourceName: "c1", sources: ["READ_SOURCE_TYPE_PROFILE"] }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.getAll("sources"), ["READ_SOURCE_TYPE_PROFILE"]);
});

Deno.test("get-person: rejects an empty resourceName before making a request", () => {
  const { ctx, calls } = mockCtx([]);
  assertThrows(() => action.execute({ resourceName: "" }, ctx), Error, "resourceName is required");
  assertEquals(calls.length, 0);
});
