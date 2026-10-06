import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/personal-contact-number-lookup.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("personal-contact-number-lookup: sends the mapped query and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{ body: { "numbers": ["+19707495020"] } }]);
  const out = await action.execute!({
    "profileUrl": "https://www.linkedin.com/in/williamhgates",
    "pageSize": 1,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    url.origin + url.pathname,
    "https://enrichlayer.com/api/v2/contact-api/personal-contact",
  );
  assertEquals(Object.fromEntries(url.searchParams), {
    "profile_url": "https://www.linkedin.com/in/williamhgates",
    "page_size": "1",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out, { "numbers": ["+19707495020"] });
});

Deno.test("personal-contact-number-lookup: unset fields are not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({} as never, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("personal-contact-number-lookup: a rejected key surfaces the vendor description", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: 401, description: "Invalid API key", name: "Unauthorized" },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "profileUrl": "https://www.linkedin.com/in/williamhgates",
        "pageSize": 1,
      }, ctx),
    Error,
    "HTTP 401 — Invalid API key (Unauthorized)",
  );
});
