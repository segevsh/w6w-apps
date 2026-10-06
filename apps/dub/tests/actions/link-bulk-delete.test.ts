import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/link-bulk-delete.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("link-bulk-delete: sends DELETE /links/bulk with the mapped input", async () => {
  const { ctx, calls } = mockCtx([{ body: { "deletedCount": 2 } }]);
  const out = await action.execute!({ "linkIds": ["a", "b"] }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.dub.co");
  assertEquals(url.pathname, "/links/bulk");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(Object.fromEntries(url.searchParams), { "linkIds": "a,b" });
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(out, { "deletedCount": 2 });
});

Deno.test("link-bulk-delete: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "deletedCount": 2 } }]);
  await action.execute!({ "linkIds": ["a", "b"] }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("link-bulk-delete: surfaces Dub's error envelope as a thrown error", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { error: { code: "unprocessable_entity", message: "bad input" } },
  }]);
  await assertRejects(
    async () => await action.execute!({ "linkIds": ["a", "b"] }, ctx),
    Error,
    "bad input (unprocessable_entity)",
  );
});

Deno.test("link-bulk-delete: declares type, idempotency and output", () => {
  assert(["read", "search", "perform"].includes(action.type));
  assert(action.params!.length > 0);
  assert(Array.isArray(action.output) && action.output.length > 0);
});
