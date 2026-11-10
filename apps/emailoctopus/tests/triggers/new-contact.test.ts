import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-contact.ts";

const input = { params: { listId: "list_1" }, subscriptionId: "sub_1" };
const contact = (id: string, createdAt = "2026-11-09T12:00:00Z") => ({
  id,
  email_address: `${id}@example.com`,
  created_at: createdAt,
});

async function withClock<T>(iso: string, fn: () => Promise<T>): Promise<T> {
  const real = Date.now;
  Date.now = () => Date.parse(iso);
  try {
    return await fn();
  } finally {
    Date.now = real;
  }
}

test("new-contact: seeds, emits unseen contacts, retries idempotently, and requests the documented since filter", async () => {
  const seed = mockCtx([{ body: { data: [contact("a")] } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);

  const state = {
    v: 1 as const,
    kind: "ids" as const,
    seeded: true as const,
    ids: ["a"],
    cursor: "2026-11-09T12:02:00.000Z",
  };
  const response = { body: { data: [contact("b"), contact("a")] } };
  const first = mockCtx([response]);
  const retry = mockCtx([response]);
  const result = await trigger.poll!({ ...input, state }, first.ctx);
  const repeated = await trigger.poll!({ ...input, state }, retry.ctx);
  assertEquals(result.events, [contact("b")]);
  assertEquals(repeated.events, result.events);
  assertEquals(first.calls[0].method, "GET");
  assertEquals(
    first.calls[0].url,
    "https://api.emailoctopus.com/lists/list_1/contacts?limit=100&created_at.gte=2026-11-09T12%3A00%3A00.000Z",
  );
});

test("new-contact: a burst of 101 contacts across a page token is fully emitted and the cursor advances", async () => {
  const state = {
    v: 1 as const,
    kind: "ids" as const,
    seeded: true as const,
    ids: ["old"],
    cursor: "2026-11-09T12:02:00.000Z",
  };
  const ids = Array.from({ length: 101 }, (_, i) => `c${i}`);
  const page1 = {
    body: {
      data: ids.slice(0, 100).map((id) => contact(id)),
      paging: { next: { starting_after: "tok1" } },
    },
  };
  const page2 = { body: { data: [contact(ids[100])] } };
  await withClock("2026-11-09T12:10:00Z", async () => {
    const { ctx, calls } = mockCtx([page1, page2]);
    const result = await trigger.poll!({ ...input, state }, ctx);
    assertEquals(result.events.length, 101);
    assertEquals(calls.length, 2);
    assertEquals(new URL(calls[1].url).searchParams.get("starting_after"), "tok1");
    assertEquals((result.nextState as { cursor?: string }).cursor, "2026-11-09T12:10:00.000Z");
  });
});

test("new-contact: when five pages do not exhaust the result the cursor stops at the newest fetched contact", async () => {
  const state = {
    v: 1 as const,
    kind: "ids" as const,
    seeded: true as const,
    ids: ["old"],
    cursor: "2026-11-09T12:00:00.000Z",
  };
  const full = (n: number) => ({
    body: {
      data: Array.from({ length: 100 }, (_, i) => contact(`p${n}-${i}`, `2026-11-09T12:0${n}:00Z`)),
      paging: { next: { starting_after: `tok${n}` } },
    },
  });
  await withClock("2026-11-09T12:30:00Z", async () => {
    const { ctx, calls } = mockCtx([full(1), full(2), full(3), full(4), full(5)]);
    const result = await trigger.poll!({ ...input, state }, ctx);
    assertEquals(calls.length, 5);
    assertEquals(result.events.length, 500);
    assertEquals((result.nextState as { cursor?: string }).cursor, "2026-11-09T12:05:00.000Z");
  });
});
