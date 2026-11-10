import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-article.ts";

const input = { params: { streamId: "enterprise/acme/category/c1" }, subscriptionId: "sub_1" };
const article = (id: string) => ({ id, title: `T ${id}`, published: 1794268800000 });
const page = (...ids: string[]) => ({ body: { id: "s", items: ids.map(article) } });

async function withClock<T>(iso: string, fn: () => Promise<T>): Promise<T> {
  const real = Date.now;
  Date.now = () => Date.parse(iso);
  try {
    return await fn();
  } finally {
    Date.now = real;
  }
}

test("new-article: seeds, emits only unseen articles, retries idempotently, sends newerThan = cursor - 2 min", async () => {
  await withClock("2026-11-10T00:30:00Z", async () => {
    const seed = mockCtx([page("a")]);
    const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(
      (seeded.nextState as { cursor?: number }).cursor,
      Date.parse("2026-11-10T00:30:00Z"),
    );

    await withClock("2026-11-10T00:35:00Z", async () => {
      const first = mockCtx([page("b", "a")]);
      const retry = mockCtx([page("b", "a")]);
      const result = await trigger.poll!({ ...input, state: seeded.nextState }, first.ctx);
      const repeated = await trigger.poll!({ ...input, state: seeded.nextState }, retry.ctx);
      assertEquals(result.events, [article("b")]);
      assertEquals(repeated, result);

      const url = new URL(first.calls[0].url);
      assertEquals(first.calls[0].method, "GET");
      assertEquals(url.pathname, "/v3/streams/contents");
      assertEquals(Object.fromEntries(url.searchParams), {
        streamId: "enterprise/acme/category/c1",
        count: "100",
        newerThan: String(Date.parse("2026-11-10T00:28:00Z")),
      });
    });
  });
});
