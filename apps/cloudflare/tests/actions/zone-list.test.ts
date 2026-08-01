import { assertEquals, assertStringIncludes } from "@std/assert";
import { cfOk, mockCtx } from "../_helpers.ts";
import action from "../../actions/zone-list.ts";

Deno.test("zone-list: GETs /zones with pagination params", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: cfOk([{ id: "z1", name: "example.com" }]) },
  ]);
  const result = await action.execute!({}, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertStringIncludes(calls[0].url, "https://api.cloudflare.com/client/v4/zones?");
  assertStringIncludes(calls[0].url, "per_page=20");
  assertStringIncludes(calls[0].url, "page=1");
  assertEquals(result, [{ id: "z1", name: "example.com" }]);
});

Deno.test("zone-list: filters by name and status", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: cfOk([]) }]);
  await action.execute!({ name: "example.com", status: "active" }, ctx);

  assertStringIncludes(calls[0].url, "name=example.com");
  assertStringIncludes(calls[0].url, "status=active");
});

Deno.test("zone-list: propagates a success:false envelope as an Error", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { success: false, errors: [{ code: 9109, message: "invalid token" }] } },
  ]);
  let threw = false;
  try {
    await action.execute!({}, ctx);
  } catch (err) {
    threw = true;
    assertStringIncludes((err as Error).message, "invalid token");
  }
  assertEquals(threw, true);
});
