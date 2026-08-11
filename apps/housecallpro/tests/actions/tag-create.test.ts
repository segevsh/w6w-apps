import { assertEquals } from "@std/assert";
import tagCreate from "../../actions/tag-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tag-create: POSTs the name", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "t1", name: "VIP" } }]);
  await tagCreate.execute({ name: "VIP" }, ctx);

  assertEquals(pathOf(calls[0].url), "/tags");
  assertEquals(bodyOf(calls[0]), { name: "VIP" });
});

Deno.test("tag-create: requires a name as a form constraint, so no empty body is ever sent", () => {
  assertEquals(tagCreate.params?.find((p) => p.key === "name")?.required, true);
});
