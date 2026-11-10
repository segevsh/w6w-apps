import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-signature-request.ts";

const input = { params: {}, subscriptionId: "sub_1" };
const request = (id: string) => ({
  signature_request_id: id,
  title: `T ${id}`,
  created_at: 1794268800,
});
const page = (...ids: string[]) => ({
  status: 200,
  body: { list_info: { num_pages: 1 }, signature_requests: ids.map(request) },
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

test("new-signature-request: seeds, emits only unseen requests, retries idempotently, searches created:[yesterday TO today]", async () => {
  await withClock("2026-11-10T00:30:00Z", async () => {
    const seed = mockCtx([page("a")]);
    const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);

    const first = mockCtx([page("b", "a")]);
    const retry = mockCtx([page("b", "a")]);
    const result = await trigger.poll!({ ...input, state: seeded.nextState }, first.ctx);
    const repeated = await trigger.poll!({ ...input, state: seeded.nextState }, retry.ctx);
    assertEquals(result.events, [request("b")]);
    assertEquals(repeated, result);

    const url = new URL(first.calls[0].url);
    assertEquals(first.calls[0].method, "GET");
    assertEquals(url.pathname, "/v3/signature_request/list");
    assertEquals(Object.fromEntries(url.searchParams), {
      query: "created:[2026-11-09 TO 2026-11-10]",
      page: "1",
      page_size: "100",
    });
  });
});

test("new-signature-request: a window of six full pages is emitted exactly once across two checks and the cursor advances after the drain", async () => {
  const full = (n: number) => ({
    status: 200,
    body: {
      list_info: { num_pages: 6 },
      signature_requests: Array.from({ length: 100 }, (_, i) => request(`p${n}-${i}`)),
    },
  });
  const state = {
    v: 1 as const,
    kind: "ids" as const,
    seeded: true as const,
    ids: ["old"],
    cursor: Date.parse("2026-11-10T00:00:00Z"),
  };
  const seen: string[] = [];
  let mid: unknown;
  await withClock("2026-11-10T00:30:00Z", async () => {
    const { ctx, calls } = mockCtx([1, 2, 3, 4, 5].map(full));
    const result = await trigger.poll!({ ...input, state }, ctx);
    assertEquals(calls.length, 5);
    assertEquals(new URL(calls[4].url).searchParams.get("page"), "5");
    seen.push(
      ...result.events.map((e) =>
        String((e as { signature_request_id: string }).signature_request_id)
      ),
    );
    mid = result.nextState;
    assertEquals((mid as { resume?: { pos?: number } }).resume?.pos, 6);
    assertEquals((mid as { cursor?: number }).cursor, state.cursor);
  });
  await withClock("2026-11-10T00:35:00Z", async () => {
    const { ctx, calls } = mockCtx([full(6)]);
    const result = await trigger.poll!({ ...input, state: mid }, ctx);
    assertEquals(calls.length, 1);
    const url = new URL(calls[0].url);
    assertEquals(url.searchParams.get("page"), "6");
    assertEquals(url.searchParams.get("query"), "created:[2026-11-09 TO 2026-11-10]");
    seen.push(
      ...result.events.map((e) =>
        String((e as { signature_request_id: string }).signature_request_id)
      ),
    );
    const next = result.nextState as { cursor?: number; resume?: unknown };
    assertEquals(next.cursor, Date.parse("2026-11-10T00:30:00Z"));
    assertEquals(next.resume, undefined);
  });
  assertEquals(seen.length, 600);
  assertEquals(new Set(seen).size, 600);
});
