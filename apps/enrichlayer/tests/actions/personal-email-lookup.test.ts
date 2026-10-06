import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/personal-email-lookup.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("personal-email-lookup: sends the mapped query and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{ body: { "emails": ["a@example.com"], "invalid_emails": [] } }]);
  const out = await action.execute!({
    "profileUrl": "https://www.linkedin.com/in/williamhgates",
    "emailValidation": "fast",
    "pageSize": 3,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    url.origin + url.pathname,
    "https://enrichlayer.com/api/v2/contact-api/personal-email",
  );
  assertEquals(Object.fromEntries(url.searchParams), {
    "profile_url": "https://www.linkedin.com/in/williamhgates",
    "email_validation": "fast",
    "page_size": "3",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out, { "emails": ["a@example.com"], "invalidEmails": [] });
});

Deno.test("personal-email-lookup: unset fields are not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({} as never, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("personal-email-lookup: a rejected key surfaces the vendor description", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: 401, description: "Invalid API key", name: "Unauthorized" },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "profileUrl": "https://www.linkedin.com/in/williamhgates",
        "emailValidation": "fast",
        "pageSize": 3,
      }, ctx),
    Error,
    "HTTP 401 — Invalid API key (Unauthorized)",
  );
});
