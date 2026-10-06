import { assertEquals } from "@std/assert";
import action from "../../actions/folder-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("folder-create: POSTs /links/folders with domainId and name", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "f1" } }]);
  const out = await action.execute({ domainId: 7, name: "Promo" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/links/folders");
  assertEquals(JSON.parse(calls[0].body!), { domainId: 7, name: "Promo" });
  assertEquals(out.result, { id: "f1" });
});
