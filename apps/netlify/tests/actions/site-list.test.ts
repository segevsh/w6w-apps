import { assertEquals, assertStringIncludes } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/site-list.ts";

Deno.test("site-list: GETs /sites with pagination params", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: [{ id: "site1", name: "example" }] },
  ]);
  const result = await action.execute!({}, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertStringIncludes(calls[0].url, "https://api.netlify.com/api/v1/sites?");
  assertStringIncludes(calls[0].url, "per_page=20");
  assertStringIncludes(calls[0].url, "page=1");
  assertEquals(result, [{ id: "site1", name: "example" }]);
});

Deno.test("site-list: filters by name and filter", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute!({ name: "example.com", filter: "owner" }, ctx);

  assertStringIncludes(calls[0].url, "name=example.com");
  assertStringIncludes(calls[0].url, "filter=owner");
});

Deno.test("site-list: propagates a non-2xx response as an Error", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: { code: 1, message: "Invalid access token" } },
  ]);
  let threw = false;
  try {
    await action.execute!({}, ctx);
  } catch (err) {
    threw = true;
    assertStringIncludes((err as Error).message, "Invalid access token");
  }
  assertEquals(threw, true);
});
