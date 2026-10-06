import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/domain-update.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("domain-update: sends PATCH /domains/go.example.com with the mapped input", async () => {
  const { ctx, calls } = mockCtx([{ body: { "slug": "go.example.com", "archived": true } }]);
  const out = await action.execute!({ "domain": "go.example.com", "archived": true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.dub.co");
  assertEquals(url.pathname, "/domains/go.example.com");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), { "archived": true });
  assertEquals(out, { "slug": "go.example.com", "archived": true });
});

Deno.test("domain-update: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "slug": "go.example.com", "archived": true } }]);
  await action.execute!({ "domain": "go.example.com", "archived": true }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("domain-update: surfaces Dub's error envelope as a thrown error", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { error: { code: "unprocessable_entity", message: "bad input" } },
  }]);
  await assertRejects(
    async () => await action.execute!({ "domain": "go.example.com", "archived": true }, ctx),
    Error,
    "bad input (unprocessable_entity)",
  );
});

Deno.test("domain-update: declares type, idempotency and output", () => {
  assert(["read", "search", "perform"].includes(action.type));
  assert(action.params!.length > 0);
  assert(Array.isArray(action.output) && action.output.length > 0);
});
