import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";
import trigger from "../../triggers/new-folder.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const folder = (id: number) => ({ type: "folder", folder_id: id, title: `Folder ${id}` });

test("new-folder: seeds, emits additions, retries idempotently, and lists folders", async () => {
  const seed = mockCtx([{ body: envelope([folder(1)]) }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "POST");
  assertEquals(pathOf(seed.calls[0].url), "/api/1/folders/list");
  const page = [folder(1), folder(2)];
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: envelope(page) }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: envelope(page) }]).ctx,
  );
  assertEquals(first.events, [{ change: "added", key: "2", values: folder(2) }]);
  assertEquals(retry, first);
});
