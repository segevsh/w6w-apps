import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-person.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const rec = (syncKey: string) => ({ syncKey, name: syncKey });
const feed = (cursor: string, ...people: unknown[]) =>
  mockCtx([{ body: { errorcode: 0, people, cursor } }]);

test("new-or-updated-person: seeds a cursor, emits only changes, retries idempotently", async () => {
  const seed = feed("c0");
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals((seeded.nextState as { token?: string }).token, "c0");
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.cloze.com/v1/people/feed?modifiedafter=now&pagesize=100",
  );

  const next = feed("c1", rec("a"));
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, next.ctx);
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    feed("c1", rec("a")).ctx,
  );
  assertEquals(next.calls[0].url, "https://api.cloze.com/v1/people/feed?cursor=c0");
  assertEquals(first.events, [rec("a")]);
  assertEquals((first.nextState as { token?: string }).token, "c1");
  assertEquals(retry, first);
});
