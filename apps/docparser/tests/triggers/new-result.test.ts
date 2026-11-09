import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-result.ts";

test("new-result seeds, emits unseen results, retries idempotently, and requests newest first", async () => {
  const input = { parserId: "p1" };
  const seeded = await trigger.poll!(
    { params: input, state: {} } as never,
    mockCtx([{ body: [{ document_id: "a" }] }]).ctx,
  ) as never as { events: unknown[]; nextState: unknown };
  assertEquals(seeded.events, []);
  const nextCtx = mockCtx([{ body: [{ document_id: "b" }, { document_id: "a" }] }]);
  const next = await trigger.poll!(
    { params: input, state: seeded.nextState } as never,
    nextCtx.ctx,
  );
  assertEquals((next as never as { events: unknown[] }).events, [{ document_id: "b" }]);
  const retry = await trigger.poll!(
    { params: input, state: seeded.nextState } as never,
    mockCtx([{ body: [{ document_id: "b" }, { document_id: "a" }] }]).ctx,
  );
  assertEquals(retry, next);
  assertEquals(
    nextCtx.calls[0].url,
    "https://api.docparser.com/v1/results/p1?list=last_uploaded&limit=100&sort_by=uploaded_at&sort_order=DESC",
  );
});
