import { assertEquals } from "@std/assert";
import labelGet from "../../actions/label-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("label-get: calls GET /labels/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 4, name: "bug" } }]);
  const out = await labelGet.execute({ labelId: 4 }, ctx) as { name: string };

  assertEquals(pathOf(calls[0].url), "/api/v3/labels/4");
  assertEquals(out.name, "bug");
});
