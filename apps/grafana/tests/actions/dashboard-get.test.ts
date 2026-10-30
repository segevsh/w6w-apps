import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/dashboard-get.ts";

const display = { endpoint: "https://example.grafana.net" };

test("dashboard-get: GETs /dashboards/uid/:uid", async () => {
  const { ctx, calls } = mockCtx([{ body: { dashboard: { uid: "cIBgcSjkk" }, meta: {} } }], {
    display,
  });
  const result = await action.execute({ uid: "cIBgcSjkk" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/api/dashboards/uid/cIBgcSjkk");
  assertEquals(result, { dashboard: { uid: "cIBgcSjkk" }, meta: {} });
});

test("dashboard-get: encodes the uid into the path", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await action.execute({ uid: "a/b c" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/dashboards/uid/a%2Fb%20c");
});
