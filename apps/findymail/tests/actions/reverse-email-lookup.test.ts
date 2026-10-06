import { assertEquals } from "@std/assert";
import action from "../../actions/reverse-email-lookup.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("reverse-email-lookup: POSTs the email and wraps the response", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "linkedin_url": "https://www.linkedin.com/in/a" },
  }]);
  const out = await action.execute!({ "email": "a@b.com", "with_profile": true } as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://app.findymail.com");
  assertEquals(url.pathname, "/api/search/reverse-email");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "email": "a@b.com",
    "with_profile": true,
  });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, { "result": { "linkedin_url": "https://www.linkedin.com/in/a" } });
});
