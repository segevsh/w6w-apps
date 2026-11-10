import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-backup.ts";

const input = { params: {}, subscriptionId: "sub-1" };

test("new-backup: seeds without emitting and requests GET /backups (limit 100)", async () => {
  const seed = mockCtx([{
    body: { data: [{ backup_id: "bk-1", status: "Ready" }], pagination: {} },
  }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://api.pinecone.io/backups?limit=100");
});

test("new-backup: emits only an added row, retries idempotently, ignores an edited row", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockCtx([{ body: { data: [{ backup_id: "bk-1", status: "Ready" }], pagination: {} } }]).ctx,
  );
  const page = {
    data: [{ backup_id: "bk-2", status: "Ready" }, { backup_id: "bk-1", status: "Ready" }],
    pagination: {},
  };
  const run = () =>
    trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([{ body: page }]).ctx);
  const first = await run();
  assertEquals(first.events, [{
    change: "added",
    key: "bk-2",
    values: { backup_id: "bk-2", status: "Ready" },
  }]);
  assertEquals(await run(), first);
  const edited = {
    data: [{ backup_id: "bk-2", status: "Ready" }, { backup_id: "bk-1", status: "Deleting" }],
    pagination: {},
  };
  const noUpdate = await trigger.poll!(
    { ...input, state: first.nextState },
    mockCtx([{ body: edited }]).ctx,
  );
  assertEquals(noUpdate.events, []);
});
