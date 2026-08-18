import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/deployment-event-list.ts";

Deno.test("deployment-event-list: returns Vercel's bare array without paging it", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ type: "stdout", text: "building" }] }], {
    display: {},
  });
  const result = await action.execute!({ idOrUrl: "dpl_1", limit: -1 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/deployments/dpl_1/events");
  // -1 is Vercel's documented "everything" value, so it must survive as-is.
  assertEquals(url.searchParams.get("limit"), "-1");
  assertEquals(calls.length, 1);
  assertEquals(result, [{ type: "stdout", text: "building" }]);
});

Deno.test("deployment-event-list: builds flag goes as Vercel's 1, and follow is never sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], { display: {} });
  await action.execute!({ idOrUrl: "dpl_1", builds: true, direction: "backward" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("builds"), "1");
  assertEquals(q.get("direction"), "backward");
  // Streaming would never return; the action deliberately has no such param.
  assertEquals(q.get("follow"), null);
  assertEquals(action.params!.some((p) => p.key === "follow"), false);
});

Deno.test("deployment-event-list: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`idOrUrl`");
  assertEquals(calls.length, 0);
});
