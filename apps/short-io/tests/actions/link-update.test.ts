import { assert, assertEquals } from "@std/assert";
import action from "../../actions/link-update.ts";
import { LINK, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("link-update: POSTs /links/{id} (not PATCH) with only the changed fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { ...LINK, title: "New" } }]);
  const out = await action.execute({ linkId: "lnk_abc_def", title: "New" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/links/lnk_abc_def");
  assertEquals(JSON.parse(calls[0].body!), { title: "New" });
  assertEquals(out.title, "New");
  assert(!("password" in out));
});

Deno.test("link-update: is idempotent", () => assertEquals(action.idempotent, true));
