import { afterEach, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { clock } from "../../lib/triggers.ts";
import created from "../../triggers/new-bulk-file.ts";
import updated from "../../triggers/new-or-updated-bulk-file.ts";

const realNow = clock.now;
afterEach(() => {
  clock.now = realNow;
});
const at = (seconds: number) => {
  clock.now = () => seconds * 1000;
};
const file = (
  id: number,
  updatedAt = "2026-11-09 10:00:00",
  createdate = "2026-11-09 09:00:00",
) => ({
  file_id: id,
  file_name: `f${id}.csv`,
  status: "finished",
  createdate,
  updated_at: updatedAt,
});
// Stamp of a file that existed before the first check (the 1_700_000_000 s seed).
const OLD = "2023-01-01 00:00:00";
const response = (...files: ReturnType<typeof file>[]) => ({
  body: { files, total: files.length },
});

for (
  const [name, trigger, idKey] of [
    ["new-bulk-file", created, "created"],
    ["new-or-updated-bulk-file", updated, "updated"],
  ] as const
) {
  const poll = (state: unknown, responses: ReturnType<typeof response>[]) => {
    const result = mockCtx(responses);
    return {
      result,
      out: trigger.poll!({ params: {}, state, subscriptionId: "sub" }, result.ctx),
    };
  };

  test(`${name} 1 first check seeds without emitting`, async () => {
    at(1_700_000_000);
    const value = await poll({}, [response(file(1))]).out;
    assertEquals(value.events, []);
    assertEquals((value.nextState as { seeded: boolean }).seeded, true);
  });

  test(`${name} 2 a new file is emitted and the cursor advances`, async () => {
    at(1_700_000_000);
    const seed = await poll({}, [response(file(1))]).out;
    at(1_700_000_060);
    const value = await poll(seed.nextState, [response(file(2), file(1, OLD, OLD))]).out;
    assertEquals(value.events.map((e) => (e as { fileId: string }).fileId), ["2"]);
    assertEquals((value.nextState as { cursor: number }).cursor, 1_700_000_060_000);
  });

  test(`${name} 3 repeated check is idempotent`, async () => {
    at(1_700_000_000);
    const seed = await poll({}, [response(file(1))]).out;
    at(1_700_000_060);
    const run = () => poll(seed.nextState, [response(file(2), file(1, OLD, OLD))]).out;
    assertEquals(await run(), await run());
  });

  test(`${name} 4 calls the literal filelist endpoint with its since filter`, async () => {
    at(1_700_000_060);
    const { result, out } = poll(
      { v: 1, kind: "ids", seeded: true, ids: [], cursor: 1_700_000_000_000 },
      [response(file(2))],
    );
    await out;
    const url = new URL(result.calls[0].url);
    assertEquals(result.calls[0].method, "GET");
    assertEquals(url.hostname, "bulkapi.millionverifier.com");
    assertEquals(url.pathname, "/bulkapi/v2/filelist");
    assertEquals(url.searchParams.get("limit"), "50");
    assertEquals(
      url.searchParams.get(idKey === "created" ? "createdate_from" : "updated_at_from"),
      "2023-11-14 22:11:20",
    );
    assertEquals(
      url.searchParams.get(idKey === "created" ? "updated_at_from" : "createdate_from"),
      null,
    );
  });
}

test("new-or-updated-bulk-file emits a known file again when its updated_at changes", async () => {
  at(1_700_000_000);
  const result = mockCtx([response(file(1, "t1"))]);
  const seed = await updated.poll!({ params: {}, state: {}, subscriptionId: "s" }, result.ctx);
  at(1_700_000_060);
  const next = mockCtx([response(file(1, "t2"))]);
  const value = await updated.poll!(
    { params: {}, state: seed.nextState, subscriptionId: "s" },
    next.ctx,
  );
  assertEquals(value.events.length, 1);
});

test("new-bulk-file does not re-emit a known file whose updated_at changes", async () => {
  at(1_700_000_000);
  const result = mockCtx([response(file(1, "t1", "2023-01-01 00:00:00"))]);
  const seed = await created.poll!({ params: {}, state: {}, subscriptionId: "s" }, result.ctx);
  at(1_700_000_060);
  const next = mockCtx([response(file(1, "t2", "2023-01-01 00:00:00"))]);
  const value = await created.poll!(
    { params: {}, state: seed.nextState, subscriptionId: "s" },
    next.ctx,
  );
  assertEquals(value.events, []);
});
