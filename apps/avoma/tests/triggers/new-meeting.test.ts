import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, pageBody } from "../_helpers.ts";
import trigger from "../../triggers/new-meeting.ts";

const page = (...ids: string[]) => ({ body: pageBody(ids.map((uuid) => ({ uuid }))) });

async function at<T>(iso: string, fn: () => Promise<T>): Promise<T> {
  const real = Date.now;
  Date.now = () => new Date(iso).getTime();
  try {
    return await fn();
  } finally {
    Date.now = real;
  }
}

test("new-meeting seeds, emits, retries, and requests the rolling -start_at window", async () => {
  const params = {};
  const NOW = "2026-11-09T12:00:00.000Z";
  const seed = await at(
    NOW,
    () => trigger.poll!({ params, state: {} }, mockCtx([page("b", "a")]).ctx),
  );
  assertEquals(seed.events, []);
  assertEquals((seed.nextState as { seeded: boolean }).seeded, true);
  const run = () => {
    const c = mockCtx([page("c", "b", "a")]);
    return at(NOW, () => trigger.poll!({ params, state: seed.nextState }, c.ctx)).then((r) => ({
      r,
      c,
    }));
  };
  const first = await run();
  assertEquals(first.r.events, [{ uuid: "c" }]);
  assertEquals((await run()).r, first.r);
  assertEquals(first.c.calls[0].method, "GET");
  assertEquals(
    first.c.calls[0].url,
    "https://api.avoma.com/v1/meetings/?from_date=2026-11-02T12%3A00%3A00.000Z&to_date=2026-11-23T12%3A00%3A00.000Z&o=-start_at&page_size=100",
  );
});
