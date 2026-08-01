import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/alert-rule-list.ts";

const display = { endpoint: "https://example.grafana.net" };

Deno.test("alert-rule-list: GETs /v1/provisioning/alert-rules", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ uid: "rule1" }] }], { display });
  const result = await action.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/provisioning/alert-rules");
  assertEquals(result, [{ uid: "rule1" }]);
});
