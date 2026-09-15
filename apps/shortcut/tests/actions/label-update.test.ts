import { assertEquals } from "@std/assert";
import labelUpdate from "../../actions/label-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("label-update: PUTs only the fields provided", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 4 } }]);
  await labelUpdate.execute({ labelId: 4, archived: true }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v3/labels/4");
  assertEquals(JSON.parse(calls[0].body!), { archived: true });
});
