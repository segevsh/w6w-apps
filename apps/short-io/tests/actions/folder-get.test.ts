import { assertEquals } from "@std/assert";
import action from "../../actions/folder-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("folder-get: GETs /links/folders/{domainId}/{folderId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "f1" } }]);
  const out = await action.execute({ domainId: 7, folderId: "f1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/links/folders/7/f1");
  assertEquals(out.result, { id: "f1" });
});
