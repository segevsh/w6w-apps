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
  });
}

// Brief 9.2: an edit is a new event only for the update feeds; a re-listed unchanged record never is.
for (const trigger of pollTriggers) {
  test(`${trigger.key}: an edited record is emitted again only when it is an update feed`, async () => {
    const updated = trigger.key.startsWith("new-or-updated-");
    const field = updated ? "updated_at" : "created_at";
    const t1 = "2026-11-10T12:01:00Z";
    const t2 = "2026-11-10T12:07:00Z";
    clock.now = () => T0;
    const seeded = await trigger.poll!(
      { params: {}, state: {}, subscriptionId: "sub-1" },
      mockCtx([]).ctx,
    );
    clock.now = () => T0 + 300_000;
    const v1 = { id: 1, [field]: t1 };
    const first = await trigger.poll!(
      { params: {}, state: seeded.nextState, subscriptionId: "sub-1" },
      mockCtx([listPage([v1])]).ctx,
    );
    assertEquals(first.events, [v1]);
    clock.now = () => T0 + 600_000;
    const v2 = { id: 1, created_at: t1, updated_at: t2 };
    const edit = await trigger.poll!(
      { params: {}, state: first.nextState, subscriptionId: "sub-1" },
      mockCtx([listPage([v2])]).ctx,
    );
    assertEquals(edit.events.length, updated ? 1 : 0);
    const repeat = await trigger.poll!(
      { params: {}, state: first.nextState, subscriptionId: "sub-1" },
      mockCtx([listPage([v1])]).ctx,
    );
    assertEquals(repeat.events, []);
  });
}
