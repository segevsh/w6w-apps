import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/job-count.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("job-count: sends the mapped query and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{ body: { "count": 887 } }]);
  const out = await action.execute!({ "searchId": "1035", "flexibility": "remote" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://enrichlayer.com/api/v2/company/job/count");
  assertEquals(Object.fromEntries(url.searchParams), {
    "flexibility": "remote",
    "search_id": "1035",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out, { "count": 887 });
});

Deno.test("job-count: unset fields are not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({} as never, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("job-count: a rejected key surfaces the vendor description", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: 401, description: "Invalid API key", name: "Unauthorized" },
  }]);
  await assertRejects(
    async () => await action.execute!({ "searchId": "1035", "flexibility": "remote" }, ctx),
    Error,
    "HTTP 401 — Invalid API key (Unauthorized)",
  );
});
