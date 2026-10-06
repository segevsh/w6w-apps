import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/company-id-lookup.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("company-id-lookup: sends the mapped query and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{ body: { "vanity_id": "google" } }]);
  const out = await action.execute!({ "id": "1441" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://enrichlayer.com/api/v2/company/resolve-id");
  assertEquals(Object.fromEntries(url.searchParams), { "id": "1441" });
  assertEquals(calls[0].body, null);
  assertEquals(out, { "vanityId": "google" });
});

Deno.test("company-id-lookup: unset fields are not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({} as never, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("company-id-lookup: a rejected key surfaces the vendor description", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: 401, description: "Invalid API key", name: "Unauthorized" },
  }]);
  await assertRejects(
    async () => await action.execute!({ "id": "1441" }, ctx),
    Error,
    "HTTP 401 — Invalid API key (Unauthorized)",
  );
});
