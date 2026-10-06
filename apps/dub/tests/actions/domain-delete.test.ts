import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/domain-delete.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("domain-delete: sends DELETE /domains/go.example.com with the mapped input", async () => {
  const { ctx, calls } = mockCtx([{ body: { "slug": "go.example.com" } }]);
  const out = await action.execute!({ "domain": "go.example.com" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.dub.co");
  assertEquals(url.pathname, "/domains/go.example.com");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(out, { "slug": "go.example.com" });
});

Deno.test("domain-delete: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "slug": "go.example.com" } }]);
  await action.execute!({ "domain": "go.example.com" }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("domain-delete: surfaces Dub's error envelope as a thrown error", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { error: { code: "unprocessable_entity", message: "bad input" } },
  }]);
  await assertRejects(
    async () => await action.execute!({ "domain": "go.example.com" }, ctx),
    Error,
    "bad input (unprocessable_entity)",
  );
});

Deno.test("domain-delete: declares type, idempotency and output", () => {
  assert(["read", "search", "perform"].includes(action.type));
  assert(action.params!.length > 0);
  assert(Array.isArray(action.output) && action.output.length > 0);
});
