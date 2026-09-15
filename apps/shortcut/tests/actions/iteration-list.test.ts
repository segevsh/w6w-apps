import { assertEquals } from "@std/assert";
import iterationList from "../../actions/iteration-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("iteration-list: calls GET /iterations", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, name: "Sprint 1" }] }]);
  const out = await iterationList.execute({}, ctx) as Array<{ name: string }>;

  assertEquals(pathOf(calls[0].url), "/api/v3/iterations");
  assertEquals(out[0].name, "Sprint 1");
});
