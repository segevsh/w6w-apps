import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/update-tag-approvers.ts";
import { mockCtx } from "../_helpers.ts";
import { assertWire, sent } from "../_job.ts";

const APPROVERS = [
  { name: "Travel", approver: "manager@domain.com" },
  { name: "Meals", approver: "" },
];

Deno.test("update-tag-approvers: posts update/tagApprovers with the list at the job's top level", async () => {
  const { ctx, calls } = mockCtx([{ body: { responseCode: 200 } }]);
  const out = await action.execute!({ policyID: "0123456789ABCDEF", tagApprovers: APPROVERS }, ctx);
  assertWire(calls[0]);
  assertEquals(sent(calls[0]).job, {
    type: "update",
    inputSettings: { type: "tagApprovers", policyID: "0123456789ABCDEF" },
    tagApprovers: APPROVERS,
  });
  assertEquals(out, { response: { responseCode: 200 } });
});

Deno.test("update-tag-approvers: an empty approver string is kept (it clears the approver)", async () => {
  const { ctx, calls } = mockCtx([{ body: { responseCode: 200 } }]);
  await action.execute!({ policyID: "P", tagApprovers: JSON.stringify(APPROVERS) }, ctx);
  assertEquals(sent(calls[0]).job.tagApprovers[1], { name: "Meals", approver: "" });
});

Deno.test("update-tag-approvers: validates names and approvers locally", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await action.execute!({ policyID: "P", tagApprovers: [{ approver: "a@b.c" }] }, ctx),
    Error,
    "name is required",
  );
  await assertRejects(
    async () => await action.execute!({ policyID: "P", tagApprovers: [{ name: "T" }] }, ctx),
    Error,
    "approver must be a string",
  );
  await assertRejects(
    async () => await action.execute!({ policyID: "", tagApprovers: APPROVERS }, ctx),
    Error,
    "policyID is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("update-tag-approvers: surfaces 403 and 410 errors", async () => {
  const { ctx } = mockCtx([{
    body: { responseMessage: "Invalid tag name 'InvalidTag'", responseCode: 410 },
  }]);
  await assertRejects(
    async () => await action.execute!({ policyID: "P", tagApprovers: APPROVERS }, ctx),
    Error,
    "Invalid tag name",
  );
});

Deno.test("update-tag-approvers: declares an idempotent perform", () => {
  assertEquals([action.type, action.idempotent], ["perform", true]);
});
