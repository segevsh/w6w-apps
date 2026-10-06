import { assertEquals } from "@std/assert";
import entityGet from "../../actions/entity-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("entity-get: GET /entities/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "e1", name: "Acme", status: "ACTIVE" } }]);
  const out = await entityGet.execute({ entityId: "e1" }, ctx) as { status: string };
  assertEquals(pathOf(calls[0].url), "/public/api/v1/entities/e1");
  assertEquals(out.status, "ACTIVE");
});
