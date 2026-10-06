import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/update-policy.ts";
import { mockCtx } from "../_helpers.ts";
import { assertWire, sent } from "../_job.ts";

const OK = { body: { responseCode: 200 } };
const CATS = [{ name: "Category 1", enabled: true, glCode: "GL1", maxExpenseAmount: 2500 }];
const TAGS = [{ name: "Tag", tags: [{ name: "Tag 1", glCode: "G" }] }];
const FIELDS = [{ name: "Report field 1", type: "dropdown", values: ["a", "b"] }];

Deno.test("update-policy: one policy, all three sections, documented shape", async () => {
  const { ctx, calls } = mockCtx([OK]);
  const out = await action.execute!({
    policyID: "0123456789ABCDEF",
    categories: CATS,
    categoriesAction: "replace",
    tags: TAGS,
    reportFields: FIELDS,
  }, ctx);
  assertWire(calls[0]);
  assertEquals(sent(calls[0]).job, {
    type: "update",
    inputSettings: { type: "policy", policyID: "0123456789ABCDEF" },
    categories: { action: "replace", data: CATS },
    tags: { data: TAGS },
    reportFields: { action: "merge", data: FIELDS },
  });
  assertEquals(out, { response: { responseCode: 200 } });
});

Deno.test("update-policy: several policies use policyIDList, JSON text is parsed, absent sections are omitted", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute!({ policyIDList: "A, B", reportFields: JSON.stringify(FIELDS) }, ctx);
  const job = sent(calls[0]).job;
  assertEquals(job.inputSettings, { type: "policy", policyIDList: ["A", "B"] });
  assertEquals(job.reportFields.data, FIELDS);
  assert(!("categories" in job) && !("tags" in job));
});

Deno.test("update-policy: validates the selector, the payload and the mode locally", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ categories: CATS }, ctx),
    Error,
    "policyID or policyIDList",
  );
  await assertRejects(
    async () =>
      await action.execute!({ policyID: "A", policyIDList: ["B"], categories: CATS }, ctx),
    Error,
    "not both",
  );
  await assertRejects(
    async () => await action.execute!({ policyID: "A" }, ctx),
    Error,
    "at least one of",
  );
  await assertRejects(
    async () =>
      await action.execute!(
        { policyID: "A", categories: CATS, categoriesAction: "wipe" as never },
        ctx,
      ),
    Error,
    "merge or replace",
  );
  await assertRejects(
    async () => await action.execute!({ policyID: "A", tags: "nope" }, ctx),
    Error,
    "valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("update-policy: surfaces the documented 404 / 410 errors", async () => {
  const { ctx } = mockCtx([{
    body: { responseMessage: "'categories' object malformed", responseCode: 410 },
  }]);
  await assertRejects(
    async () => await action.execute!({ policyID: "A", categories: CATS }, ctx),
    Error,
    "malformed",
  );
});

Deno.test("update-policy: declares an idempotent perform", () => {
  assertEquals([action.type, action.idempotent], ["perform", true]);
});
