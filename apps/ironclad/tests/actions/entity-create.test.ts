import { assertEquals } from "@std/assert";
import entityCreate from "../../actions/entity-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("entity-create: POST /entities, 201 body returned", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "e2", name: "Acme" } }]);
  const out = await entityCreate.execute(
    { name: "Acme", relationshipTypeKey: '["counterparty"]', status: "ACTIVE" },
    ctx,
  ) as { id: string };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/public/api/v1/entities");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Acme",
    relationshipTypeKey: ["counterparty"],
    status: "ACTIVE",
  });
  assertEquals(out.id, "e2");
});
