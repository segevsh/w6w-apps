import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/list-policies.ts";
import { mockCtx } from "../_helpers.ts";
import { assertWire, sent } from "../_job.ts";

const POLICIES = [
  {
    outputCurrency: "USD",
    owner: "a@acme.com",
    role: "user",
    name: "Acme USA",
    id: "DEADBEEF12345678",
    type: "corporate",
  },
  {
    outputCurrency: "EUR",
    owner: "a@acme.com",
    role: "admin",
    name: "Acme FR",
    id: "BA5EBA1187654321",
    type: "corporate",
  },
];

Deno.test("list-policies: posts get/policyList and returns the list with a count", async () => {
  const { ctx, calls } = mockCtx([{ body: { responseCode: 200, policyList: POLICIES } }]);
  const out = await action.execute!({ adminOnly: true, userEmail: "e@d.com" }, ctx);
  assertWire(calls[0]);
  assertEquals(sent(calls[0]).job, {
    type: "get",
    inputSettings: { type: "policyList", adminOnly: true, userEmail: "e@d.com" },
  });
  assertEquals(out, { policyList: POLICIES, count: 2 });
});

Deno.test("list-policies: a bare call sends only the type, and no policies is an empty list", async () => {
  const { ctx, calls } = mockCtx([{ body: { responseCode: 200 } }]);
  const out = await action.execute!({}, ctx);
  assertEquals(sent(calls[0]).job.inputSettings, { type: "policyList" });
  assertEquals(out, { policyList: [], count: 0 });
});

Deno.test("list-policies: an authentication error is thrown even at HTTP 200", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { responseMessage: "Authentication error", responseCode: 404 },
  }]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "Authentication error");
});

Deno.test("list-policies: declares a read with output", () => {
  assertEquals(action.type, "read");
  assert(Array.isArray(action.output));
});
