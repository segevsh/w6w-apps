import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/find-email-by-name.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("find-email-by-name: POSTs name and domain", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "contact": { "name": "John Doe", "domain": "website.com", "email": "john@website.com" },
    },
  }]);
  const out = await action.execute!({ "name": "John Doe", "domain": "website.com" } as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://app.findymail.com");
  assertEquals(url.pathname, "/api/search/name");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "name": "John Doe",
    "domain": "website.com",
  });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, {
    "contact": { "name": "John Doe", "domain": "website.com", "email": "john@website.com" },
  });
});

Deno.test("find-email-by-name: forwards the webhook URL", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "status": "queued" } }]);
  const out = await action.execute!(
    { "name": "John Doe", "domain": "website.com", "webhook_url": "https://x.test/hook" } as never,
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://app.findymail.com");
  assertEquals(url.pathname, "/api/search/name");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "name": "John Doe",
    "domain": "website.com",
    "webhook_url": "https://x.test/hook",
  });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, { "status": "queued" });
});

Deno.test("find-email-by-name: surfaces a 423 paused-subscription error", async () => {
  const { ctx } = mockCtx([{ status: 423, body: { "error": "Subscription is paused" } }]);
  const err = await assertRejects(async () =>
    await action.execute!({ "name": "A", "domain": "b.com" } as never, ctx)
  );
  const msg = (err as Error).message;
  assert(msg.includes("HTTP 423"), msg);
  assert(msg.includes("Subscription is paused"), msg);
});
