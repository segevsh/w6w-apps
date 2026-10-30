import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import spaceCustomFieldCreate from "../../actions/space-custom-field-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("space-custom-field-create: POSTs a text field", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, name: "Customer ID", dataType: "text" } }]);
  await spaceCustomFieldCreate.execute(
    { name: "Customer ID", dataType: "text", description: "Unique id" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v2/space/custom_field");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Customer ID",
    description: "Unique id",
    dataType: "text",
  });
});

test("space-custom-field-create: a list field requires allowedValues", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await spaceCustomFieldCreate.execute({ name: "Priority", dataType: "list" }, ctx),
    Error,
    "Allowed values are required",
  );
  assertEquals(calls.length, 0);
});

test("space-custom-field-create: a list field with allowedValues sends the array", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, name: "Priority", dataType: "list" } }]);
  await spaceCustomFieldCreate.execute(
    { name: "Priority", dataType: "list", allowedValues: ["Low", "High"] },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).allowedValues, ["Low", "High"]);
});

test("space-custom-field-create: is not idempotent", () => {
  assertEquals(spaceCustomFieldCreate.idempotent, false);
});
