import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/tag-update.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("tag-update: sends PATCH /tags/t1 with the mapped input", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": "t1", "name": "promo", "color": "green" } }]);
  const out = await action.execute!({ "tagId": "t1", "color": "green" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.dub.co");
  assertEquals(url.pathname, "/tags/t1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), { "color": "green" });
  assertEquals(out, { "id": "t1", "name": "promo", "color": "green" });
});

Deno.test("tag-update: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": "t1", "name": "promo", "color": "green" } }]);
  await action.execute!({ "tagId": "t1", "color": "green" }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("tag-update: surfaces Dub's error envelope as a thrown error", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { error: { code: "unprocessable_entity", message: "bad input" } },
  }]);
  await assertRejects(
    async () => await action.execute!({ "tagId": "t1", "color": "green" }, ctx),
    Error,
    "bad input (unprocessable_entity)",
  );
});

Deno.test("tag-update: declares type, idempotency and output", () => {
  assert(["read", "search", "perform"].includes(action.type));
  assert(action.params!.length > 0);
  assert(Array.isArray(action.output) && action.output.length > 0);
});
