import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/audience-export-query.ts";

Deno.test("audience-export-query: is addressed by the export's own resource name", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { audienceRows: [] } }], { display: {} });
  await action.execute!({ name: "properties/123/audienceExports/9", limit: 10 }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(
    calls[0].url,
    "https://analyticsdata.googleapis.com/v1beta/properties/123/audienceExports/9:query",
  );
  assertEquals(JSON.parse(calls[0].body!), { limit: "10" });
});

Deno.test("audience-export-query: a name that is not a resource name is caught here", async () => {
  const bad = mockCtx([], { display: {} });
  await assertRejects(
    async () => await action.execute!({ name: "9" }, bad.ctx),
    Error,
    "full resource name",
  );
  const missing = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({}, missing.ctx), Error, "`name`");
  assertEquals(bad.calls.length + missing.calls.length, 0);
});
