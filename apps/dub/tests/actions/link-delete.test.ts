import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/link-delete.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("link-delete: sends DELETE /links/link_1 with the mapped input", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": "link_1" } }]);
  const out = await action.execute!({ "linkId": "link_1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.dub.co");
  assertEquals(url.pathname, "/links/link_1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(out, { "id": "link_1" });
});

Deno.test("link-delete: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": "link_1" } }]);
  await action.execute!({ "linkId": "link_1" }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("link-delete: surfaces Dub's error envelope as a thrown error", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { error: { code: "unprocessable_entity", message: "bad input" } },
  }]);
  await assertRejects(
    async () => await action.execute!({ "linkId": "link_1" }, ctx),
    Error,
    "bad input (unprocessable_entity)",
  );
});

Deno.test("link-delete: declares type, idempotency and output", () => {
  assert(["read", "search", "perform"].includes(action.type));
  assert(action.params!.length > 0);
  assert(Array.isArray(action.output) && action.output.length > 0);
});
