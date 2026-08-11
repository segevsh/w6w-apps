import { assertEquals } from "@std/assert";
import action from "../../actions/entity-get.ts";
import { envelope, mockCtx, pathOf, queryAll } from "../_helpers.ts";

Deno.test("entity-get: GETs the entity by id and unwraps data", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "e-1", type: "feature" }) }]);
  const out = await action.execute({ entityId: "e-1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/entities/e-1");
  assertEquals(out.data, { id: "e-1", type: "feature" });
});

Deno.test("entity-get: fields uses the bracketed, repeated spelling", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await action.execute({ entityId: "e-1", fields: "all" }, ctx);
  assertEquals(queryAll(calls[0].url, "fields[]"), ["all"]);
});

Deno.test("entity-get: the id is required", () => {
  assertEquals(action.params?.find((p) => p.key === "entityId")?.required, true);
});
