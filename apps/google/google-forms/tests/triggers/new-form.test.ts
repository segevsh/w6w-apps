import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-form.ts";

test("new-form seeds, emits, retries, and requests created-time descending", async () => {
  const seed = mockCtx([{ body: { files: [{ id: "a" }] } }]);
  const first = await trigger.poll!({ params: {}, state: {}, subscriptionId: "s" }, seed.ctx);
  assertEquals(first.events, []);
  assertEquals((first.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://www.googleapis.com/drive/v3/files?q=mimeType%3D%27application%2Fvnd.google-apps.form%27+and+trashed%3Dfalse&pageSize=1000&orderBy=createdTime+desc&fields=nextPageToken%2CincompleteSearch%2Cfiles%28id%2Cname%2CcreatedTime%2CmodifiedTime%2CwebViewLink%29",
  );
});
