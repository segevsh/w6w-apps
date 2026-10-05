import { assertEquals, assertRejects } from "@std/assert";
import recordAction from "../../actions/record-action.ts";
import { BASE, mockCtx, run } from "../_helpers.ts";

Deno.test("record-action: POSTs to /<id>/@<action> with the parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: { links: [] } }]);
  const out = await run(recordAction, {
    recordType: "vendorPayment",
    id: "3",
    action: "confirm",
    parameters: { confirmationDate: "2019-1-31", postingPeriod: 348 },
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${BASE}/services/rest/record/v1/vendorPayment/3/@confirm`);
  assertEquals(JSON.parse(calls[0].body!), { confirmationDate: "2019-1-31", postingPeriod: 348 });
  assertEquals(out, { result: { links: [] } });
});

Deno.test("record-action: no parameters means no body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await run(recordAction, { recordType: "vendorPayment", id: "3", action: "approve" }, ctx);
  assertEquals(calls[0].body, null);
});

Deno.test("record-action: an action name that could alter the path is refused", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await run(recordAction, { recordType: "customer", id: "1", action: "../x" }, ctx),
    Error,
    "Invalid record action",
  );
  assertEquals(calls.length, 0);
});
