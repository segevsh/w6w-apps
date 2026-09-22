import { assert, assertEquals, assertRejects } from "@std/assert";
import adjustInventory from "../../actions/adjust-inventory.ts";
import {
  API_ROOT,
  bodyOf,
  errorBody,
  mockCtx,
  mockCtxWithInvocation,
  UUID_V4,
} from "../_helpers.ts";

Deno.test("adjust-inventory: POST /1.0/commerce/inventory/adjustments answers 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await adjustInventory.execute!({
    decrementOperations: [{ quantity: 2, variantId: "V1" }],
    setUnlimitedOperations: ["V2"],
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${API_ROOT}/1.0/commerce/inventory/adjustments`);
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(bodyOf(calls[0]), {
    decrementOperations: [{ quantity: 2, variantId: "V1" }],
    setUnlimitedOperations: ["V2"],
  });
  assertEquals(out, { ok: true });
});

Deno.test("adjust-inventory: the four operation arrays are all optional on their own", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await adjustInventory.execute!({
    incrementOperations: [{ quantity: 1, variantId: "V1" }],
    setFiniteOperations: [{ quantity: 9, variantId: "V2" }],
  }, ctx);

  assertEquals(bodyOf(calls[0]), {
    incrementOperations: [{ quantity: 1, variantId: "V1" }],
    setFiniteOperations: [{ quantity: 9, variantId: "V2" }],
  });
});

Deno.test("adjust-inventory: an Idempotency-Key is stamped from the invocation", async () => {
  const { ctx, calls } = mockCtxWithInvocation([{ status: 204 }], "inv-inventory-1");
  await adjustInventory.execute!({ setUnlimitedOperations: ["V2"] }, ctx);

  assertEquals(calls[0].headers["idempotency-key"], "inv-inventory-1");
});

Deno.test("adjust-inventory: without an invocation the key is a fresh UUID", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }, { status: 204 }]);
  await adjustInventory.execute!({ setUnlimitedOperations: ["V2"] }, ctx);
  await adjustInventory.execute!({ setUnlimitedOperations: ["V2"] }, ctx);

  assert(UUID_V4.test(calls[0].headers["idempotency-key"]));
  assert(UUID_V4.test(calls[1].headers["idempotency-key"]));
  assert(calls[0].headers["idempotency-key"] !== calls[1].headers["idempotency-key"]);
});

Deno.test("adjust-inventory: an empty adjustment is refused before the request", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await adjustInventory.execute!({}, ctx),
    Error,
    "at least one of incrementOperations",
  );
});

Deno.test("adjust-inventory: a 400 INSUFFICIENT_STOCK body is surfaced", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: errorBody("INVALID_REQUEST_ERROR", {
      subtype: "INSUFFICIENT_STOCK",
      message: "Not enough stock",
    }),
  }]);

  await assertRejects(
    async () =>
      await adjustInventory.execute!(
        { decrementOperations: [{ quantity: 99, variantId: "V1" }] },
        ctx,
      ),
    Error,
    "INSUFFICIENT_STOCK",
  );
});
