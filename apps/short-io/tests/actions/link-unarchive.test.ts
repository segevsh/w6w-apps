import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import action from "../../actions/link-unarchive.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("link-unarchive: POSTs /links/unarchive with link_id (and domain_id only if given)", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }, { body: { success: true } }]);
  await action.execute({ linkId: "lnk_a_b" }, ctx);
  assertEquals(pathOf(calls[0].url), "/links/unarchive");
  assertEquals(JSON.parse(calls[0].body!), { link_id: "lnk_a_b" });
  await action.execute({ linkId: "123", domainId: "7" }, ctx);
  assertEquals(JSON.parse(calls[1].body!), { link_id: "123", domain_id: "7" });
});

test("link-unarchive: success:false is an error", async () => {
  const { ctx } = mockCtx([{ body: { success: false, error: "bad" } }]);
  await assertRejects(async () => await action.execute({ linkId: "x" }, ctx), Error, "bad");
});
