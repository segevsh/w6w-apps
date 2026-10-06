import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/verify-email.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("verify-email: posts the email and returns the verdict", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "email": "john@example.com", "verified": true, "provider": "Google" },
  }]);
  const out = await action.execute!({ "email": "john@example.com" } as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://app.findymail.com");
  assertEquals(url.pathname, "/api/verify");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "email": "john@example.com",
  });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, { "email": "john@example.com", "verified": true, "provider": "Google" });
});

Deno.test("verify-email: surfaces a 402 not-enough-credits error", async () => {
  const { ctx } = mockCtx([{ status: 402, body: { "error": "Not enough credits" } }]);
  const err = await assertRejects(async () =>
    await action.execute!({ "email": "a@b.com" } as never, ctx)
  );
  const msg = (err as Error).message;
  assert(msg.includes("HTTP 402"), msg);
  assert(msg.includes("Not enough credits"), msg);
});
