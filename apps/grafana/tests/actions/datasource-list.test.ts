import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/datasource-list.ts";

const display = { endpoint: "https://example.grafana.net" };

Deno.test("datasource-list: GETs /datasources", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ uid: "ds1", name: "Prometheus" }] }], { display });
  const result = await action.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/api/datasources");
  assertEquals(result, [{ uid: "ds1", name: "Prometheus" }]);
});
