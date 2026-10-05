import { assertEquals, assertRejects } from "@std/assert";
import orderUpdateCustomField from "../../actions/order-update-custom-field.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "orderId": 1337,
  "customFieldSlug": "custom_zL6FLFM3",
  "customFieldData": "America",
};
const RESPONSE = { "success": "true", "data": "ok" };

Deno.test("order-update-custom-field: sends PUT /v1/orders/1337 with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await orderUpdateCustomField.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/orders/1337");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "custom_field_slug": "custom_zL6FLFM3",
    "custom_field_data": "America",
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("order-update-custom-field: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{ body: RESPONSE }]);
  assertEquals(await orderUpdateCustomField.execute(INPUT, ctx), {
    "response": { "success": "true", "data": "ok" },
  });
});

Deno.test("order-update-custom-field: an error surfaces SamCart's own message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Object could not be found" } }]);
  const err = await assertRejects(
    () => Promise.resolve(orderUpdateCustomField.execute(INPUT, ctx)),
    Error,
  );
  assertEquals(err.message.includes("Object could not be found"), true, err.message);
});

Deno.test("order-update-custom-field: a non-integer orderId is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(
        orderUpdateCustomField.execute({ ...INPUT, orderId: "1/../2" as unknown as number }, ctx),
      ),
    Error,
    "positive integer",
  );
  assertEquals(calls.length, 0);
});
