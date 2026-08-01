import { assertEquals } from "@std/assert";
import { mockSplunkCtx } from "../_helpers.ts";
import action from "../../actions/search-oneshot.ts";

Deno.test("search-oneshot: sets exec_mode=oneshot and returns results inline", async () => {
  const { ctx, calls } = mockSplunkCtx([{ body: { results: [{ count: "3" }], fields: [] } }]);
  const out = await action.execute(
    { search: "search index=_internal | head 3", maxCount: 3 },
    ctx,
  );
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("exec_mode"), "oneshot");
  assertEquals(body.get("count"), "3");
  assertEquals(out, { results: [{ count: "3" }], fields: [] });
});
