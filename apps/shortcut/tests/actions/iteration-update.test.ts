import { assertEquals } from "@std/assert";
import iterationUpdate from "../../actions/iteration-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("iteration-update: PUTs only the fields provided", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 3 } }]);
  await iterationUpdate.execute({ iterationId: 3, name: "Sprint 1 (renamed)" }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v3/iterations/3");
  assertEquals(JSON.parse(calls[0].body!), { name: "Sprint 1 (renamed)" });
});
