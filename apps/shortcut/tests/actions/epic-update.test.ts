import { assertEquals } from "@std/assert";
import epicUpdate from "../../actions/epic-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("epic-update: PUTs only the fields provided", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 9 } }]);
  await epicUpdate.execute({ epicId: 9, archived: true }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v3/epics/9");
  assertEquals(JSON.parse(calls[0].body!), { archived: true });
});
