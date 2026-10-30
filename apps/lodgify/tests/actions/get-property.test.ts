import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import getProperty from "../../actions/get-property.ts";

test("get-property: GETs /v2/properties/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 7, name: "Villa" } }]);
  const out = await getProperty.execute({ propertyId: 7, includeInOut: true }, ctx) as {
    name: string;
  };
  assertEquals(pathOf(calls[0].url), "/v2/properties/7");
  assertEquals(queryOf(calls[0].url), { includeInOut: "true" });
  assertEquals(out.name, "Villa");
});

test("get-property: requires a property id", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(() => Promise.resolve(getProperty.execute({}, ctx)), Error, "propertyId");
  assertEquals(calls.length, 0);
});

test("errors: a non-2xx throws with the vendor's message and code", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { message: "Property not found", code: 12, correlation_id: "x" },
  }]);
  await assertRejects(
    () => Promise.resolve(getProperty.execute({ propertyId: 1 }, ctx)),
    Error,
    "Lodgify 404 for GET /v2/properties/1: Property not found (code 12)",
  );
});
