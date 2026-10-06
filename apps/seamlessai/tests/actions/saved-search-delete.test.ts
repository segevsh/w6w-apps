import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/saved-search-delete.ts";

const RESPONSE = { "success": true };

Deno.test("saved-search-delete: calls DELETE /api/client/v2/saved-searches/{id} and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  const result = await action.execute!({ "id": "7" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.seamless.ai");
  assertEquals(url.pathname, "/api/client/v2/saved-searches/7");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(result, RESPONSE);
});

Deno.test("saved-search-delete: sends nothing for fields left unset", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute!({ "id": "7" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body, null);
});

Deno.test("saved-search-delete: refuses a missing id before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({} as never, ctx));
  assertEquals(calls.length, 0);
});

Deno.test("saved-search-delete: surfaces the vendor's error body", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { msg: "Insufficient credit amount.", code: "insufficientCredits" },
  }]);
  await assertRejects(
    async () => await action.execute!({ "id": "7" }, ctx),
    Error,
    "insufficientCredits",
  );
});
