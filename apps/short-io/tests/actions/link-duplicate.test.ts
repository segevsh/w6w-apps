import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import action from "../../actions/link-duplicate.ts";
import { LINK, mockCtx, pathOf } from "../_helpers.ts";

test("link-duplicate: POSTs /links/duplicate/{id}; path sent only when set", async () => {
  const { ctx, calls } = mockCtx([{ body: LINK }, { body: LINK }]);
  const out = await action.execute({ linkId: "lnk_a_b" }, ctx);
  assertEquals(pathOf(calls[0].url), "/links/duplicate/lnk_a_b");
  assertEquals(JSON.parse(calls[0].body!), {});
  assert(!("password" in out));
  await action.execute({ linkId: "lnk_a_b", path: "copy" }, ctx);
  assertEquals(JSON.parse(calls[1].body!), { path: "copy" });
  assertEquals(action.idempotent, false);
});
