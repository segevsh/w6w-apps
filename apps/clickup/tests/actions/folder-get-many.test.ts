import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/folder-get-many.ts";

test("folder-get-many: GETs /space/{id}/folder", async () => {
  const { ctx, calls } = mockCtx([{ body: { folders: [] } }]);
  await action.execute!({ spaceId: "s1", archived: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2/space/s1/folder");
  assertEquals(url.searchParams.get("archived"), "true");
});
