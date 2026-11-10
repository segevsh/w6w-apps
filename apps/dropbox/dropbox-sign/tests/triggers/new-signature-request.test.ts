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
