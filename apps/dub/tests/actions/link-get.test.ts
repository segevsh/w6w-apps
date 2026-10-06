import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/link-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("link-get: sends GET /links/info with the mapped input", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "id": "link_1", "shortLink": "https://dub.sh/abc", "url": "https://example.com" },
  }]);
  const out = await action.execute!({ "domain": "dub.sh", "key": "abc" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.dub.co");
  assertEquals(url.pathname, "/links/info");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), { "domain": "dub.sh", "key": "abc" });
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(out, {
    "id": "link_1",
    "shortLink": "https://dub.sh/abc",
    "url": "https://example.com",
  });
});

Deno.test("link-get: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "id": "link_1", "shortLink": "https://dub.sh/abc", "url": "https://example.com" },
  }]);
  await action.execute!({ "domain": "dub.sh", "key": "abc" }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("link-get: surfaces Dub's error envelope as a thrown error", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { error: { code: "unprocessable_entity", message: "bad input" } },
  }]);
  await assertRejects(
    async () => await action.execute!({ "domain": "dub.sh", "key": "abc" }, ctx),
    Error,
    "bad input (unprocessable_entity)",
  );
});

Deno.test("link-get: declares type, idempotency and output", () => {
  assert(["read", "search", "perform"].includes(action.type));
  assert(action.params!.length > 0);
  assert(Array.isArray(action.output) && action.output.length > 0);
});
