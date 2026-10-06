import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/reverse-email-lookup.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("reverse-email-lookup: sends the mapped query and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "profile": { "public_identifier": "satyanadella" } },
  }]);
  const out = await action.execute!({
    "email": "satya@microsoft.com",
    "lookupDepth": "superficial",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://enrichlayer.com/api/v2/profile/resolve/email");
  assertEquals(Object.fromEntries(url.searchParams), {
    "email": "satya@microsoft.com",
    "lookup_depth": "superficial",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out, {
    "profile": { "public_identifier": "satyanadella" },
    "result": { "profile": { "public_identifier": "satyanadella" } },
  });
});

Deno.test("reverse-email-lookup: unset fields are not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({} as never, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("reverse-email-lookup: a rejected key surfaces the vendor description", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: 401, description: "Invalid API key", name: "Unauthorized" },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({ "email": "satya@microsoft.com", "lookupDepth": "superficial" }, ctx),
    Error,
    "HTTP 401 — Invalid API key (Unauthorized)",
  );
});
