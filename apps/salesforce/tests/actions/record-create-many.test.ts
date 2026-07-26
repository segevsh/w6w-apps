import { assertEquals, assertThrows } from "@std/assert";
import { mockSalesforceCtx } from "../_helpers.ts";
import action from "../../actions/record-create-many.ts";

Deno.test("record-create-many: POSTs the composite collection with per-record attributes", async () => {
  const { ctx, calls } = mockSalesforceCtx([{ body: [{ id: "00Q1", success: true }] }]);
  await action.execute({ sobject: "Lead", records: [{ LastName: "A" }, { LastName: "B" }] }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/services/data/v60.0/composite/sobjects");
  assertEquals(JSON.parse(calls[0].body!), {
    allOrNone: true,
    records: [
      { attributes: { type: "Lead" }, LastName: "A" },
      { attributes: { type: "Lead" }, LastName: "B" },
    ],
  });
});

Deno.test("record-create-many: allOrNone:false allows partial success", async () => {
  const { ctx, calls } = mockSalesforceCtx([{ body: [] }]);
  await action.execute({ sobject: "Lead", records: [{ a: 1 }], allOrNone: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!).allOrNone, false);
});

Deno.test("record-create-many: enforces Salesforce's 200-record cap before sending", () => {
  const { ctx, calls } = mockSalesforceCtx();
  const tooMany = Array.from({ length: 201 }, () => ({ LastName: "x" }));
  assertThrows(
    () => action.execute({ sobject: "Lead", records: tooMany }, ctx),
    Error,
    "at most 200 records",
  );
  assertEquals(calls.length, 0);
});

Deno.test("record-create-many: rejects an empty or non-array payload", () => {
  const { ctx } = mockSalesforceCtx();
  assertThrows(() => action.execute({ sobject: "Lead", records: [] }, ctx), Error, "is empty");
  assertThrows(
    () => action.execute({ sobject: "Lead", records: { a: 1 } }, ctx),
    Error,
    "must be a JSON array",
  );
});
