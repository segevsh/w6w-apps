import { assertEquals } from "@std/assert";
import labelCreate from "../../actions/label-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("label-create: posts name and color", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 4 } }]);
  await labelCreate.execute({ name: "bug", color: "#ff0000" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v3/labels");
  assertEquals(JSON.parse(calls[0].body!), { name: "bug", color: "#ff0000" });
});
