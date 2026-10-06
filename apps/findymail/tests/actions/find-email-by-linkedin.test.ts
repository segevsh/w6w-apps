import { assertEquals } from "@std/assert";
import action from "../../actions/find-email-by-linkedin.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("find-email-by-linkedin: POSTs the profile URL", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "contact": { "name": "John Doe", "domain": "website.com", "email": "john@website.com" },
    },
  }]);
  const out = await action.execute!({ "linkedin_url": "johndoe" } as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://app.findymail.com");
  assertEquals(url.pathname, "/api/search/business-profile");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "linkedin_url": "johndoe",
  });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, {
    "contact": { "name": "John Doe", "domain": "website.com", "email": "john@website.com" },
  });
});

Deno.test("find-email-by-linkedin: forwards the webhook URL", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const out = await action.execute!(
    { "linkedin_url": "johndoe", "webhook_url": "https://x.test/hook" } as never,
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://app.findymail.com");
  assertEquals(url.pathname, "/api/search/business-profile");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "linkedin_url": "johndoe",
    "webhook_url": "https://x.test/hook",
  });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, {});
});
