import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-contact.ts";

const input = { params: { listId: "list_1" }, subscriptionId: "sub_1" };
const contact = (id: string, updated: string) => ({
  id,
  email_address: `${id}@example.com`,
  created_at: "2026-11-09T11:00:00Z",
  last_updated_at: updated,
});

test("new-or-updated-contact: seeds, emits an edited contact again, retries idempotently, and requests last_updated_at.gte", async () => {
  const seed = mockCtx([{ body: { data: [contact("a", "2026-11-09T12:00:00Z")] } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);

  const state = {
    v: 1 as const,
    kind: "ids" as const,
    seeded: true as const,
    ids: ["a:2026-11-09T12:00:00Z"],
    cursor: "2026-11-09T12:02:00.000Z",
  };
  const response = {
    body: { data: [contact("a", "2026-11-09T12:01:00Z"), contact("a", "2026-11-09T12:00:00Z")] },
  };
  const first = mockCtx([response]);
  const retry = mockCtx([response]);
  const result = await trigger.poll!({ ...input, state }, first.ctx);
  const repeated = await trigger.poll!({ ...input, state }, retry.ctx);
  assertEquals(result.events, [contact("a", "2026-11-09T12:01:00Z")]);
  assertEquals(repeated.events, result.events);
  assertEquals(first.calls[0].method, "GET");
  assertEquals(
    first.calls[0].url,
    "https://api.emailoctopus.com/lists/list_1/contacts?limit=100&last_updated_at.gte=2026-11-09T12%3A00%3A00.000Z",
  );
});

test("new-or-updated-contact: a window of six full pages is emitted exactly once across two checks and the cursor advances after the drain", async () => {
  const state = {
    v: 1 as const,
    kind: "ids" as const,
    seeded: true as const,
    ids: ["old:x"],
    cursor: "2026-11-09T12:00:00.000Z",
  };
  const full = (n: number, last: boolean) => ({
    body: {
      data: Array.from(
        { length: 100 },
        (_, i) => contact(`p${n}-${i}`, "2026-11-09T12:10:00Z"),
      ),
      ...(last ? {} : { paging: { next: { starting_after: `tok${n}` } } }),
    },
  });
  const seen: string[] = [];
  const clock = async <T>(iso: string, fn: () => Promise<T>) => {
    const real = Date.now;
    Date.now = () => Date.parse(iso);
    try {
      return await fn();
    } finally {
      Date.now = real;
    }
  };
  let mid: unknown;
  await clock("2026-11-09T12:30:00Z", async () => {
    const { ctx } = mockCtx([1, 2, 3, 4, 5].map((n) => full(n, false)));
    const result = await trigger.poll!({ ...input, state }, ctx);
    seen.push(...result.events.map((e) => String((e as { id: string }).id)));
    mid = result.nextState;
    assertEquals((mid as { resume?: { pos?: string } }).resume?.pos, "tok5");
  });
  await clock("2026-11-09T12:35:00Z", async () => {
    const { ctx, calls } = mockCtx([full(6, true)]);
    const result = await trigger.poll!({ ...input, state: mid }, ctx);
    assertEquals(new URL(calls[0].url).searchParams.get("starting_after"), "tok5");
    seen.push(...result.events.map((e) => String((e as { id: string }).id)));
    const next = result.nextState as { cursor?: number; resume?: unknown };
    assertEquals(next.cursor, Date.parse("2026-11-09T12:30:00Z"));
    assertEquals(next.resume, undefined);
  });
  assertEquals(seen.length, 600);
  assertEquals(new Set(seen).size, 600);
});
