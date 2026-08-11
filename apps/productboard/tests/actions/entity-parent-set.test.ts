import { assertEquals } from "@std/assert";
import action from "../../actions/entity-parent-set.ts";
import { bodyOf, envelope, mockCtx, pathOf } from "../_helpers.ts";

/** The only PUT in the Entities surface — an entity has at most one parent. */
Deno.test("entity-parent-set: PUTs the parent sub-path", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ type: "parent" }) }]);
  const out = await action.execute({ entityId: "e-1", targetId: "p-1" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/entities/e-1/relationships/parent");
  assertEquals(bodyOf(calls[0]), { data: { target: { id: "p-1" } } });
  assertEquals(out.data, { type: "parent" });
});

/**
 * The optional entity type sits BESIDE `target` in the body, not inside it —
 * the vendor's schema puts an `EntityType` at the data level and gives `target`
 * only an `id`.
 */
Deno.test("entity-parent-set: the target type goes beside target, never inside it", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await action.execute({ entityId: "e-1", targetId: "p-1", targetType: "component" }, ctx);
  assertEquals(bodyOf(calls[0]), {
    data: { type: "component", target: { id: "p-1" } },
  });
});

Deno.test("entity-parent-set: is idempotent — re-setting the same parent is a no-op", () => {
  assertEquals(action.idempotent, true);
});
