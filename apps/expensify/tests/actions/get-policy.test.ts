import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-policy.ts";
import { mockCtx } from "../_helpers.ts";
import { assertWire, sent } from "../_job.ts";

const INFO = { "4C6722D4BD2BD941": { categories: [{ name: "Meals", enabled: true }] } };

Deno.test("get-policy: posts get/policy with the id list, fields and user", async () => {
  const { ctx, calls } = mockCtx([{ body: { responseCode: 200, policyInfo: INFO } }]);
  const out = await action.execute!({
    policyIDList: ["4C6722D4BD2BD941", "DEADBEEF01234567"],
    fields: ["categories", "tax"],
    userEmail: "e@d.com",
  }, ctx);
  assertWire(calls[0]);
  assertEquals(sent(calls[0]).job, {
    type: "get",
    inputSettings: {
      type: "policy",
      fields: ["categories", "tax"],
      policyIDList: ["4C6722D4BD2BD941", "DEADBEEF01234567"],
      userEmail: "e@d.com",
    },
  });
  assertEquals(out, { policyInfo: INFO });
});

Deno.test("get-policy: accepts comma-separated text for both lists", async () => {
  const { ctx, calls } = mockCtx([{ body: { responseCode: 200, policyInfo: {} } }]);
  await action.execute!({ policyIDList: "A, B", fields: "tags,employees" }, ctx);
  const s = sent(calls[0]).job.inputSettings;
  assertEquals(s.policyIDList, ["A", "B"]);
  assertEquals(s.fields, ["tags", "employees"]);
});

Deno.test("get-policy: rejects missing ids, missing fields and unknown fields locally", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ policyIDList: [], fields: ["tags"] }, ctx),
    Error,
    "policyIDList is required",
  );
  await assertRejects(
    async () => await action.execute!({ policyIDList: ["A"], fields: [] }, ctx),
    Error,
    "fields is required",
  );
  await assertRejects(
    async () => await action.execute!({ policyIDList: ["A"], fields: ["bogus"] }, ctx),
    Error,
    "unsupported fields: bogus",
  );
  assertEquals(calls.length, 0);
});

Deno.test("get-policy: surfaces the vendor's validation error", async () => {
  const { ctx } = mockCtx([{
    body: { responseMessage: "Required parameter 'policyIDList' is missing", responseCode: 410 },
  }]);
  await assertRejects(
    async () => await action.execute!({ policyIDList: ["A"], fields: ["tags"] }, ctx),
    Error,
    "policyIDList",
  );
});

Deno.test("get-policy: declares a read", () => {
  assertEquals(action.type, "read");
});
