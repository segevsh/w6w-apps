import { assertEquals } from "@std/assert";
import templateGet from "../../actions/template-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("template-get: GETs /template/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 5, status: "PROD" } }]);
  const out = await templateGet.execute({ templateId: "5" }, ctx) as { status: string };

  assertEquals(pathOf(calls[0].url), "/template/5");
  assertEquals(out.status, "PROD");
});
