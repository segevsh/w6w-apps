import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/component-list.ts";

const conn = { display: { pageId: "pg1" } };

Deno.test("component-list: reads the page's components", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "c1", name: "API" }] }], conn);
  const out = await action.execute!({}, ctx) as { components: unknown[] };
  assertEquals(out.components.length, 1);
  assertEquals(new URL(calls[0].url).pathname, "/v1/pages/pg1/components");
});

Deno.test("component-list: an explicit page overrides the connection's", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], conn);
  await action.execute!({ pageId: "pg2" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/pages/pg2/components");
});
