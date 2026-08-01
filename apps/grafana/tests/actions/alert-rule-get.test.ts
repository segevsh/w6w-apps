import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/alert-rule-get.ts";

const display = { endpoint: "https://example.grafana.net" };

Deno.test("alert-rule-get: GETs /v1/provisioning/alert-rules/:uid", async () => {
  const { ctx, calls } = mockCtx([{ body: { uid: "rule1", title: "High CPU" } }], { display });
  const result = await action.execute({ uid: "rule1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/provisioning/alert-rules/rule1");
  assertEquals(result, { uid: "rule1", title: "High CPU" });
});
