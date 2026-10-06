import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/tag-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("tag-create: sends POST /tags with the mapped input", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": "t1", "name": "promo", "color": "blue" } }]);
  const out = await action.execute!({ "name": "promo", "color": "blue" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.dub.co");
  assertEquals(url.pathname, "/tags");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "name": "promo",
    "color": "blue",
  });
  assertEquals(out, { "id": "t1", "name": "promo", "color": "blue" });
});

Deno.test("tag-create: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": "t1", "name": "promo", "color": "blue" } }]);
  await action.execute!({ "name": "promo", "color": "blue" }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("tag-create: surfaces Dub's error envelope as a thrown error", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { error: { code: "unprocessable_entity", message: "bad input" } },
  }]);
  await assertRejects(
    async () => await action.execute!({ "name": "promo", "color": "blue" }, ctx),
    Error,
    "bad input (unprocessable_entity)",
  );
});

Deno.test("tag-create: declares type, idempotency and output", () => {
  assert(["read", "search", "perform"].includes(action.type));
  assert(action.params!.length > 0);
  assert(Array.isArray(action.output) && action.output.length > 0);
});
