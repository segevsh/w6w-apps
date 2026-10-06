import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/domain-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("domain-create: sends POST /domains with the mapped input", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": "d1", "slug": "go.example.com" } }]);
  const out = await action.execute!({
    "slug": "go.example.com",
    "notFoundUrl": "https://example.com/404",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.dub.co");
  assertEquals(url.pathname, "/domains");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "slug": "go.example.com",
    "notFoundUrl": "https://example.com/404",
  });
  assertEquals(out, { "id": "d1", "slug": "go.example.com" });
});

Deno.test("domain-create: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": "d1", "slug": "go.example.com" } }]);
  await action.execute!(
    { "slug": "go.example.com", "notFoundUrl": "https://example.com/404" },
    ctx,
  );
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("domain-create: surfaces Dub's error envelope as a thrown error", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { error: { code: "unprocessable_entity", message: "bad input" } },
  }]);
  await assertRejects(
    async () =>
      await action.execute!(
        { "slug": "go.example.com", "notFoundUrl": "https://example.com/404" },
        ctx,
      ),
    Error,
    "bad input (unprocessable_entity)",
  );
});

Deno.test("domain-create: declares type, idempotency and output", () => {
  assert(["read", "search", "perform"].includes(action.type));
  assert(action.params!.length > 0);
  assert(Array.isArray(action.output) && action.output.length > 0);
});
