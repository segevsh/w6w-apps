import { assertEquals } from "@std/assert";
import action from "../../actions/entity-relationship-create.ts";
import { bodyOf, envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("entity-relationship-create: POSTs {type, target:{id}}", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ type: "link" }) }]);
  const out = await action.execute({ entityId: "e-1", type: "link", targetId: "t-1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/entities/e-1/relationships");
  assertEquals(bodyOf(calls[0]), { data: { type: "link", target: { id: "t-1" } } });
  assertEquals(out.data, { type: "link" });
});

/**
 * The vendor's `ResourceReferenceAssign` schema has exactly one property, `id`.
 * A target carrying a `type` or an `email` is not something this endpoint takes.
 */
Deno.test("entity-relationship-create: the target is addressed by id only", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({}) }]);
  await action.execute({ entityId: "e-1", type: "isBlocking", targetId: "t-2" }, ctx);
  const body = bodyOf(calls[0]) as { data: { target: Record<string, unknown> } };
  assertEquals(Object.keys(body.data.target), ["id"]);
});

Deno.test("entity-relationship-create: the type defaults to the vendor's own default", () => {
  assertEquals(action.params?.find((p) => p.key === "type")?.default, "link");
  assertEquals(action.idempotent, true);
});
