import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/datasource-get.ts";

const display = { endpoint: "https://example.grafana.net" };

test("datasource-get: GETs /datasources/uid/:uid", async () => {
  const { ctx, calls } = mockCtx([{ body: { uid: "ds1", name: "Prometheus" } }], { display });
  const result = await action.execute({ uid: "ds1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/api/datasources/uid/ds1");
  assertEquals(result, { uid: "ds1", name: "Prometheus" });
});
