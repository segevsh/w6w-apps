import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockWorkableCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-candidate.ts";

const params = { shortcode: "GROOV005" };
const cand = (id: string) => ({ id, name: id });
const FIXED_NOW = Date.parse("2026-11-09T12:00:00.000Z");

async function withNow<T>(fn: () => Promise<T>): Promise<T> {
  const real = Date.now;
  Date.now = () => FIXED_NOW;
  try {
    return await fn();
  } finally {
    Date.now = real;
  }
}

test("new-candidate seeds, emits only the new candidate, retries identically, filters created_after", async () => {
  await withNow(async () => {
    const seed = mockWorkableCtx([{ body: { candidates: [cand("old")] } }]);
    const seeded = await trigger.poll!({ state: {}, params } as never, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
    assertEquals(
      seed.calls[0].url,
      "https://acme.workable.com/spi/v3/candidates?shortcode=GROOV005&created_after=2026-11-08T12%3A00%3A00.000Z&limit=50",
    );
    const responses = [{ body: { candidates: [cand("new"), cand("old")] } }];
    const first = await trigger.poll!(
      { state: seeded.nextState, params } as never,
      mockWorkableCtx(responses).ctx,
    );
    const retry = await trigger.poll!(
      { state: seeded.nextState, params } as never,
      mockWorkableCtx(responses).ctx,
    );
    assertEquals(first.events, [cand("new")]);
    assertEquals(retry, first);
  });
});

test("new-candidate follows paging.next but stops at maxPages (3)", async () => {
  await withNow(async () => {
    const next = "https://acme.workable.com/spi/v3/candidates?since_id=x";
    const page = (id: string) => ({ body: { candidates: [cand(id)], paging: { next } } });
    const m = mockWorkableCtx([page("a"), page("b"), page("c"), page("d")]);
    await trigger.poll!({ state: {}, params } as never, m.ctx);
    assertEquals(m.calls.length, 1); // unseeded: only page 1 is read
    const m2 = mockWorkableCtx([page("a"), page("b"), page("c"), page("d")]);
    const seeded = await trigger.poll!(
      { state: {}, params } as never,
      mockWorkableCtx([page("z")]).ctx,
    );
    await trigger.poll!({ state: seeded.nextState, params } as never, m2.ctx);
    assertEquals(m2.calls.length, 3);
    assertEquals(m2.calls[1].url, next);
  });
});
