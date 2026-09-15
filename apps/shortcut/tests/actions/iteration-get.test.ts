import { assertEquals } from "@std/assert";
import iterationGet from "../../actions/iteration-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("iteration-get: calls GET /iterations/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 3, name: "Sprint 1" } }]);
  const out = await iterationGet.execute({ iterationId: 3 }, ctx) as { name: string };

  assertEquals(pathOf(calls[0].url), "/api/v3/iterations/3");
  assertEquals(out.name, "Sprint 1");
});
