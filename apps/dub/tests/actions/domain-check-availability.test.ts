import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/domain-check-availability.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("domain-check-availability: sends GET /domains/status with the mapped input", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "domain": "a.link", "available": true }] }]);
  const out = await action.execute!({ "domains": "a.link, b.link" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.dub.co");
  assertEquals(url.pathname, "/domains/status");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), { "domains": "a.link,b.link" });
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(out, { "domains": [{ "domain": "a.link", "available": true }] });
});

Deno.test("domain-check-availability: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "domain": "a.link", "available": true }] }]);
  await action.execute!({ "domains": "a.link, b.link" }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("domain-check-availability: surfaces Dub's error envelope as a thrown error", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { error: { code: "unprocessable_entity", message: "bad input" } },
  }]);
  await assertRejects(
    async () => await action.execute!({ "domains": "a.link, b.link" }, ctx),
    Error,
    "bad input (unprocessable_entity)",
  );
});

Deno.test("domain-check-availability: declares type, idempotency and output", () => {
  assert(["read", "search", "perform"].includes(action.type));
  assert(action.params!.length > 0);
  assert(Array.isArray(action.output) && action.output.length > 0);
});
