import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/service-get.ts";

Deno.test("service-get: fetches by id and unwraps `.service`", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { service: { id: "SV1" } } }]);
  const result = await action.execute!({ serviceId: "SV1" }, ctx);
  assertEquals(calls[0].url, "https://api.pagerduty.com/services/SV1");
  assertEquals(result, { id: "SV1" });
});

Deno.test("service-get: missing serviceId rejects", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ serviceId: "" }, ctx),
    Error,
    "serviceId",
  );
});
