import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/page-label-list.ts";

const display = { site: "acme" };

Deno.test("page-label-list: reads a page's labels, with an optional prefix filter", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { results: [{ name: "runbook" }], _links: {} },
  }], {
    display,
  });
  const result = await action.execute!({ pageId: "1", prefix: "global" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/wiki/api/v2/pages/1/labels");
  assertEquals(url.searchParams.get("prefix"), "global");
  assertEquals(result, [{ name: "runbook" }]);
});

Deno.test("page-label-list: is read-only — v2 publishes no label write endpoint", () => {
  assertEquals(action.type, "read");
});

Deno.test("page-label-list: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`pageId` is required");
  assertEquals(calls.length, 0);
});
