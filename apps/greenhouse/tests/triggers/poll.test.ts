import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { listPage, mockCtx } from "../_helpers.ts";
import { clock, pollTriggers } from "../../triggers/poll.ts";

const T0 = Date.parse("2026-11-10T12:00:00Z");
const endpoints: Record<string, string> = {
  "application-stage": "application_stages",
  application: "applications",
  attachment: "attachments",
  candidate: "candidates",
  department: "departments",
  "job-interview-stage": "job_interview_stages",
  "job-post": "job_posts",
  job: "jobs",
  note: "notes",
  offer: "offers",
  office: "offices",
  opening: "openings",
  "rejection-reason": "rejection_reasons",
  scorecard: "scorecards",
  source: "sources",
  user: "users",
  interview: "interviews",
};

for (const trigger of pollTriggers) {
  test(`${trigger.key}: seeds, emits, retries idempotently, and uses the literal incremental request`, async () => {
    const key = trigger.key.replace("new-or-updated-", "").replace("new-", "");
    const updated = trigger.key.startsWith("new-or-updated-");
    const field = updated ? "updated_at" : "created_at";
    const endpoint = endpoints[key]!;
    const old = { id: 1, [field]: "2026-11-10T11:59:00Z" };
    const fresh = { id: 2, [field]: "2026-11-10T12:03:00Z" };
    clock.now = () => T0;
    const seeded = await trigger.poll!(
      { params: {}, state: {}, subscriptionId: "sub-1" },
      mockCtx([listPage([old])]).ctx,
    );
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);

    clock.now = () => T0 + 300_000;
    const firstCtx = mockCtx([listPage([fresh, old])]);
    const first = await trigger.poll!(
      { params: {}, state: seeded.nextState, subscriptionId: "sub-1" },
      firstCtx.ctx,
    );
    const retry = await trigger.poll!(
      { params: {}, state: seeded.nextState, subscriptionId: "sub-1" },
      mockCtx([listPage([fresh, old])]).ctx,
    );
    assertEquals(first.events, [fresh]);
    assertEquals(retry, first);
    assertEquals(firstCtx.calls[0].method, "GET");
    assertEquals(
      firstCtx.calls[0].url,
      `https://harvest.greenhouse.io/v3/${endpoint}?per_page=100&${field}=gte%7C2026-11-10T11%3A58%3A00.000Z`,
    );

    if (updated) {
      const edited = { id: 1, updated_at: "2026-11-10T12:04:00Z" };
      const edit = await trigger.poll!(
        { params: {}, state: seeded.nextState, subscriptionId: "sub-1" },
        mockCtx([listPage([edited, old])]).ctx,
      );
      assertEquals(edit.events, [edited]);
    }
  });
}
