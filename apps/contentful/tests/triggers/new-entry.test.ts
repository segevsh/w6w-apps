import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-entry.ts";

const params = { spaceId: "sp", environmentId: "master" };
test("new-entry seeds, emits once, retries idempotently, and requests newest entries", async () => {
  const seeded = await trigger.poll!(
    { params, state: {} },
    mockCtx([{ body: { items: [{ sys: { id: "a" } }] } }]).ctx,
  );
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState.seeded, true);
  const page = { body: { items: [{ sys: { id: "b" } }, { sys: { id: "a" } }] } };
  const first = mockCtx([page]);
  const emitted = await trigger.poll!({ params, state: seeded.nextState }, first.ctx);
  assertEquals(emitted.events, [{ sys: { id: "b" } }]);
  assertEquals({
    method: first.calls[0].method,
    path: new URL(first.calls[0].url).pathname,
    query: Object.fromEntries(new URL(first.calls[0].url).searchParams),
  }, {
    method: "GET",
    path: "/spaces/sp/environments/master/entries",
    query: { limit: "100", skip: "0", order: "-sys.createdAt" },
  });
  assertEquals(
    await trigger.poll!({ params, state: seeded.nextState }, mockCtx([page]).ctx),
    emitted,
  );
});
