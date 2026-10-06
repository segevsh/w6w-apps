import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/inventory-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const level = { variant_id: "v1", store_id: "s1", stock_after: 12.5 };

Deno.test("inventory-update: POST /v1.0/inventory wraps levels in inventory_levels", async () => {
  const { ctx, calls } = mockCtx([{ body: { inventory_levels: [{ ...level, in_stock: 12.5 }] } }]);
  const out = await action.execute({ levels: [level] }, ctx) as { inventory_levels: unknown[] };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1.0/inventory");
  assertEquals(JSON.parse(calls[0].body!), { inventory_levels: [level] });
  assertEquals(out.inventory_levels.length, 1);
});

Deno.test("inventory-update: accepts levels as a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: { inventory_levels: [] } }]);
  await action.execute({ levels: JSON.stringify([level]) }, ctx);
  assertEquals(JSON.parse(calls[0].body!).inventory_levels[0].stock_after, 12.5);
});

Deno.test("inventory-update: rejects bad input before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(action.execute({ levels: "{nope" }, ctx)),
    Error,
    "JSON",
  );
  await assertRejects(
    () => Promise.resolve(action.execute({ levels: [] }, ctx)),
    Error,
    "non-empty",
  );
  await assertRejects(
    () =>
      Promise.resolve(
        action.execute({
          levels: [{ variant_id: "v", store_id: "s", stock_after: "3" as unknown as number }],
        }, ctx),
      ),
    Error,
    "stock_after",
  );
  assertEquals(calls.length, 0);
});

Deno.test("inventory-update: sets absolute stock, so it is safe to retry", () => {
  assertEquals(action.idempotent, true);
});
