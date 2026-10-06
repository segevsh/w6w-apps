import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/tag-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("tag-list: sends GET /tags with the mapped input", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": "t1", "name": "promo", "color": "red" }] }]);
  const out = await action.execute!({
    "search": "promo",
    "ids": ["t1", "t2"],
    "sortBy": "createdAt",
    "sortOrder": "desc",
    "page": 1,
    "pageSize": 20,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.dub.co");
  assertEquals(url.pathname, "/tags");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {
    "search": "promo",
    "ids": "t1,t2",
    "sortBy": "createdAt",
    "sortOrder": "desc",
    "page": "1",
    "pageSize": "20",
  });
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(out, { "tags": [{ "id": "t1", "name": "promo", "color": "red" }] });
});

Deno.test("tag-list: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": "t1", "name": "promo", "color": "red" }] }]);
  await action.execute!({
    "search": "promo",
    "ids": ["t1", "t2"],
    "sortBy": "createdAt",
    "sortOrder": "desc",
    "page": 1,
    "pageSize": 20,
  }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("tag-list: surfaces Dub's error envelope as a thrown error", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { error: { code: "unprocessable_entity", message: "bad input" } },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "search": "promo",
        "ids": ["t1", "t2"],
        "sortBy": "createdAt",
        "sortOrder": "desc",
        "page": 1,
        "pageSize": 20,
      }, ctx),
    Error,
    "bad input (unprocessable_entity)",
  );
});

Deno.test("tag-list: declares type, idempotency and output", () => {
  assert(["read", "search", "perform"].includes(action.type));
  assert(action.params!.length > 0);
  assert(Array.isArray(action.output) && action.output.length > 0);
});
