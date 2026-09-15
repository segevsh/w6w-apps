import { assertEquals } from "@std/assert";
import epicGet from "../../actions/epic-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("epic-get: calls GET /epics/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 9, name: "Q4 Launch" } }]);
  const out = await epicGet.execute({ epicId: 9 }, ctx) as { name: string };

  assertEquals(pathOf(calls[0].url), "/api/v3/epics/9");
  assertEquals(out.name, "Q4 Launch");
});
