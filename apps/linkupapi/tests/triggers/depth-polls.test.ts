import { describe, test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newAccount from "../../triggers/new-account.ts";
import newInvitation from "../../triggers/new-invitation.ts";
import newJob from "../../triggers/new-job.ts";
import newWebhookEvent from "../../triggers/new-webhook-event.ts";

const B = "https://api.linkupapi.com";
const run = (t: typeof newAccount, params: unknown, state: unknown, ctx: never) =>
  t.poll!({ params, state, subscriptionId: "sub_1" } as never, ctx);
const ok = (data: unknown) => ({ body: { success: true, data } });

describe("new-account", () => {
  const acct = (id: string) => ({ account_id: id, platform: "linkedin" });
  const page = (...ids: string[]) => ok({ items: ids.map(acct) });

  test("seeds, emits only the account at the head, retries idempotently, sends the literal GET", async () => {
    const seed = mockCtx([page("a-1")]);
    const seeded = await run(newAccount, {}, {}, seed.ctx as never);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, `${B}/v2/accounts?count=50&offset=0`);
    const a = await run(
      newAccount,
      {},
      seeded.nextState,
      mockCtx([page("a-2", "a-1")]).ctx as never,
    );
    const b = await run(
      newAccount,
      {},
      seeded.nextState,
      mockCtx([page("a-2", "a-1")]).ctx as never,
    );
    assertEquals(a.events, [acct("a-2")]);
    assertEquals(b, a);
  });
});

describe("new-invitation", () => {
  const inv = (id: string) => ({
    entity_urn: `urn:li:fsd_invitation:${id}`,
    invitation_type: "CONNECTION",
  });
  const page = (ids: string[], hasMore = false) =>
    ok({ invitations: ids.map(inv), pagination: { has_more: hasMore } });
  const params = { accountId: "account-1" };

  test("seeds, emits only the new invitation, retries idempotently, sends the literal request", async () => {
    const seed = mockCtx([page(["1"])]);
    const seeded = await run(newInvitation, params, {}, seed.ctx as never);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
    assertEquals(seed.calls[0].method, "POST");
    assertEquals(seed.calls[0].url, `${B}/v2/network`);
    assertEquals(JSON.parse(seed.calls[0].body!), {
      account_id: "account-1",
      action: "list_invitations",
      params: { count: 100, offset: 0 },
    });
    const a = await run(
      newInvitation,
      params,
      seeded.nextState,
      mockCtx([page(["2", "1"])]).ctx as never,
    );
    const b = await run(
      newInvitation,
      params,
      seeded.nextState,
      mockCtx([page(["2", "1"])]).ctx as never,
    );
    assertEquals(a.events, [inv("2")]);
    assertEquals(b, a);
  });

  test("a withdrawn invitation does not emit and a list longer than 100 fails loudly", async () => {
    const seeded = await run(newInvitation, params, {}, mockCtx([page(["1", "2"])]).ctx as never);
    const next = await run(
      newInvitation,
      params,
      seeded.nextState,
      mockCtx([page(["2"])]).ctx as never,
    );
    assertEquals(next.events, []);
    await assertRejects(
      () => run(newInvitation, params, {}, mockCtx([page(["1"], true)]).ctx as never),
      Error,
      "more than 100",
    );
  });

  test("an edited invitation does not emit", async () => {
    const seeded = await run(newInvitation, params, {}, mockCtx([page(["1"])]).ctx as never);
    const edited = ok({
      invitations: [{ ...inv("1"), invitation_type: "ORGANIZATION" }],
      pagination: { has_more: false },
    });
    const next = await run(newInvitation, params, seeded.nextState, mockCtx([edited]).ctx as never);
    assertEquals(next.events, []);
  });
});

describe("new-job", () => {
  const job = (id: string) => ({ linkedin_job_id: id, title: `Job ${id}` });
  const page = (ids: string[], hasMore = false) =>
    ok({ posts: ids.map(job), pagination: { has_more: hasMore } });
  const params = { accountId: "account-1" };

  test("seeds, emits only the new posting, retries idempotently, sends the literal request", async () => {
    const seed = mockCtx([page(["1"])]);
    const seeded = await run(newJob, params, {}, seed.ctx as never);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
    assertEquals(seed.calls[0].url, `${B}/v2/recruiter`);
    assertEquals(JSON.parse(seed.calls[0].body!), {
      account_id: "account-1",
      action: "get_posts",
      params: { count: 100, offset: 0, fetch_details: false },
    });
    const a = await run(newJob, params, seeded.nextState, mockCtx([page(["1", "2"])]).ctx as never);
    const b = await run(newJob, params, seeded.nextState, mockCtx([page(["1", "2"])]).ctx as never);
    assertEquals(a.events, [job("2")]);
    assertEquals(b, a);
  });

  test("a list longer than 100 fails loudly", async () => {
    await assertRejects(
      () => run(newJob, params, {}, mockCtx([page(["1"], true)]).ctx as never),
      Error,
      "more than 100",
    );
  });
});

describe("new-webhook-event", () => {
  const params = { webhookId: "wh-1" };
  const ev = (id: string, at: string) => ({
    event_id: id,
    event: { type: "message" },
    created_at: at,
  });
  const page = (...events: unknown[]) => ok({ items: events, next_cursor: null });
  const realNow = Date.now;
  const FLOOR = Date.parse("2026-11-10T10:00:00.000Z");

  async function seeded() {
    Date.now = () => FLOOR;
    try {
      return await run(newWebhookEvent, params, {}, mockCtx([]).ctx as never);
    } finally {
      Date.now = realNow;
    }
  }

  test("seeds with no request and no events, then emits only events stored after the seed", async () => {
    const seed = mockCtx([]);
    Date.now = () => FLOOR;
    let first;
    try {
      first = await run(newWebhookEvent, params, {}, seed.ctx as never);
    } finally {
      Date.now = realNow;
    }
    assertEquals(first.events, []);
    assertEquals(seed.calls.length, 0);
    assertEquals(first.nextState, { v: 1, seeded: true, floor: FLOOR });
  });

  test("first read uses since=floor, later reads continue after the last event (literal requests)", async () => {
    const s = await seeded();
    const c1 = mockCtx([
      page(ev("e-1", "2026-11-10T10:01:00Z"), ev("e-2", "2026-11-10T10:02:00Z")),
    ]);
    const r1 = await run(newWebhookEvent, params, s.nextState, c1.ctx as never);
    assertEquals(c1.calls[0].method, "GET");
    assertEquals(
      c1.calls[0].url,
      `${B}/v2/webhooks/wh-1/events?since=2026-11-10T10%3A00%3A00.000Z&count=50`,
    );
    assertEquals(r1.events.map((e) => (e as { event_id: string }).event_id), ["e-1", "e-2"]);
    assertEquals((r1.nextState as { after: string }).after, "e-2");
    const c2 = mockCtx([page(ev("e-3", "2026-11-10T10:03:00Z"))]);
    const r2 = await run(newWebhookEvent, params, r1.nextState, c2.ctx as never);
    assertEquals(c2.calls[0].url, `${B}/v2/webhooks/wh-1/events?after=e-2&count=50`);
    assertEquals(r2.events.map((e) => (e as { event_id: string }).event_id), ["e-3"]);
  });

  test("idempotent retry: same state and response give the same result", async () => {
    const s = await seeded();
    const body = page(ev("e-1", "2026-11-10T10:01:00Z"));
    const a = await run(newWebhookEvent, params, s.nextState, mockCtx([body]).ctx as never);
    const b = await run(newWebhookEvent, params, s.nextState, mockCtx([body]).ctx as never);
    assertEquals(a, b);
  });

  test("an empty check keeps the cursor, and events stored before the seed floor are dropped", async () => {
    const s = await seeded();
    const empty = await run(newWebhookEvent, params, s.nextState, mockCtx([page()]).ctx as never);
    assertEquals(empty.events, []);
    assertEquals(empty.nextState, s.nextState);
    const stale = await run(
      newWebhookEvent,
      params,
      s.nextState,
      mockCtx([page(ev("old-1", "2026-11-10T09:59:59Z"), ev("new-1", "2026-11-10T10:00:01Z"))])
        .ctx as never,
    );
    assertEquals(stale.events.map((e) => (e as { event_id: string }).event_id), ["new-1"]);
  });

  test("a backlog longer than a page drains over successive checks, none twice", async () => {
    const s = await seeded();
    const full = Array.from({ length: 50 }, (_, i) => ev(`p1-${i}`, "2026-11-10T10:05:00Z"));
    const rest = [ev("p2-0", "2026-11-10T10:06:00Z"), ev("p2-1", "2026-11-10T10:07:00Z")];
    const r1 = await run(
      newWebhookEvent,
      params,
      s.nextState,
      mockCtx([page(...full)]).ctx as never,
    );
    const c2 = mockCtx([page(...rest)]);
    const r2 = await run(newWebhookEvent, params, r1.nextState, c2.ctx as never);
    assertEquals(c2.calls[0].url, `${B}/v2/webhooks/wh-1/events?after=p1-49&count=50`);
    const ids = [...r1.events, ...r2.events].map((e) => (e as { event_id: string }).event_id);
    assertEquals(ids.length, 52);
    assertEquals(new Set(ids).size, 52);
  });
});
