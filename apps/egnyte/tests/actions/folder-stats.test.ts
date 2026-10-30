import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockEgnyteCtx } from "../_helpers.ts";
import action from "../../actions/folder-stats.ts";

test("folder-stats: GETs /v1/fs/ids/folder/<id>/stats", async () => {
  const { ctx, calls } = mockEgnyteCtx([{ body: { filesCount: 3 } }]);
  assertEquals(await action.execute({ folderId: "f1" }, ctx), { filesCount: 3 });
  assertEquals(calls[0].url, "https://acme.egnyte.com/pubapi/v1/fs/ids/folder/f1/stats");
});
