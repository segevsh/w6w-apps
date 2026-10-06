import { assertEquals } from "@std/assert";
import action from "../../actions/template-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("template-get: GET /v1/groups/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "g1", name: "T", designIds: ["d1"] } }]);
  const out = await action.execute({ groupId: "g1" }, ctx) as { designIds: string[] };
  assertEquals(pathOf(calls[0].url), "/v1/groups/g1");
  assertEquals(out.designIds, ["d1"]);
});
