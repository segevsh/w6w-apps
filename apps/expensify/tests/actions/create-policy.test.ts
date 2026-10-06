import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/create-policy.ts";
import { mockCtx } from "../_helpers.ts";
import { assertWire, sent } from "../_job.ts";

Deno.test("create-policy: posts create/policy with the name and plan", async () => {
  const { ctx, calls } = mockCtx([{
    body: { responseCode: 200, policyID: "0123456789ABCDEF", policyName: "My New Policy" },
  }]);
  const out = await action.execute!({ policyName: " My New Policy ", plan: "corporate" }, ctx);
  assertWire(calls[0]);
  assertEquals(sent(calls[0]).job, {
    type: "create",
    inputSettings: { type: "policy", policyName: "My New Policy", plan: "corporate" },
  });
  assertEquals(out, { policyID: "0123456789ABCDEF", policyName: "My New Policy" });
});

Deno.test("create-policy: omits plan when unset and rejects a blank name", async () => {
  const { ctx, calls } = mockCtx([{ body: { responseCode: 200, policyID: "P", policyName: "N" } }]);
  await action.execute!({ policyName: "N" }, ctx);
  assert(!("plan" in sent(calls[0]).job.inputSettings));
  await assertRejects(
    async () => await action.execute!({ policyName: "  " }, mockCtx([]).ctx),
    Error,
    "policyName is required",
  );
});

Deno.test("create-policy: surfaces the vendor error", async () => {
  const { ctx } = mockCtx([{
    body: { responseMessage: "Required parameter 'policyName' is missing", responseCode: 500 },
  }]);
  await assertRejects(
    async () => await action.execute!({ policyName: "N" }, ctx),
    Error,
    "policyName",
  );
});

Deno.test("create-policy: declares a non-idempotent perform with a plan select", () => {
  assertEquals([action.type, action.idempotent], ["perform", false]);
  assert(action.params!.find((p) => p.key === "plan")!.options);
});
