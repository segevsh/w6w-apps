import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import memberCreated from "../../triggers/member-created.ts";
import memberUpdated from "../../triggers/member-updated.ts";
import memberDeleted from "../../triggers/member-deleted.ts";
import pledgeUpdated from "../../triggers/pledge-updated.ts";
import pledgeDeleted from "../../triggers/pledge-deleted.ts";
import postUpdated from "../../triggers/post-updated.ts";
import postDeleted from "../../triggers/post-deleted.ts";
import anyEvent from "../../triggers/any-event.ts";
import newCampaign from "../../triggers/new-campaign.ts";

async function rejects(fn: () => PromiseLike<unknown> | unknown): Promise<Error> {
  try {
    await fn();
  } catch (err) {
    assert(err instanceof Error, "rejected with a non-Error");
    return err;
  }
  throw new Error("Expected the call to reject.");
}

const evs = (r: unknown) =>
  (Array.isArray(r) ? r : (r as { events: unknown[] }).events) as Array<Record<string, unknown>>;
const SECRET = "test-secret-for-patreon-0123456789";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_3";
const sign = (b: string, secret = SECRET) => createHmac("md5", secret).update(b).digest("hex");

// Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY.
const MEMBER = `{ "data" : { "id":"mem-1", "type":"member",
  "attributes": { "full_name":"Sample Patron", "patron_status":"active_patron" },
  "relationships": { "campaign": { "data": { "id":"123456", "type":"campaign" } } } } }`;
const POST = `{ "data" : { "id":"p-9", "type":"post", "attributes": { "title":"Hi" },
  "relationships": { "campaign": { "data": { "id":"123456", "type":"campaign" } } } } }`;
for (const b of [MEMBER, POST]) assertEquals(JSON.stringify(JSON.parse(b)) !== b, true);

const call = (
  b: string | undefined,
  event: string | undefined,
  secret: string | null = SECRET,
  headers?: Record<string, string>,
  params: Record<string, unknown> = { campaignId: "123456" },
) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers: headers ?? {
      ...(event ? { "x-patreon-event": event } : {}),
      "x-patreon-signature": sign(b ?? "x"),
    },
    body: b === undefined ? null : JSON.parse(b),
    ...(b === undefined ? {} : { rawBody: b }),
  },
  params,
  state: { campaignId: "123456", webhookId: "w1", secret: secret ?? undefined },
  subscriptionId: "sub_3",
});
// deno-lint-ignore no-explicit-any
const ingest = async (t: any, input: ReturnType<typeof call>) =>
  await t.handleIngest!(input, mockCtx().ctx);

function flips(sig: string): string[] {
  return [0, Math.floor(sig.length / 2), sig.length - 1].map((i) =>
    sig.slice(0, i) + (sig[i] === "a" ? "b" : "a") + sig.slice(i + 1)
  );
}

const SIGNED = [
  [memberCreated, "members:create", MEMBER],
  [memberUpdated, "members:update", MEMBER],
  [memberDeleted, "members:delete", MEMBER],
  [pledgeUpdated, "members:pledge:update", MEMBER],
  [pledgeDeleted, "members:pledge:delete", MEMBER],
  [postUpdated, "posts:update", POST],
  [postDeleted, "posts:delete", POST],
  [anyEvent, "posts:publish", POST],
  [anyEvent, "members:pledge:create", MEMBER],
] as const;

for (const [t, trigger, body] of SIGNED) {
  test(`patreon ${t.key} (${trigger}): MD5-HMAC verified, tampering refused`, async () => {
    const out = evs(await ingest(t, call(body, trigger)));
    assertEquals(out.length, 1);
    assertEquals(out[0].trigger, trigger);
    assertEquals(out[0].campaignId, "123456");

    const good = sign(body);
    for (const bad of flips(good)) {
      const err = await rejects(() =>
        ingest(
          t,
          call(body, trigger, SECRET, { "x-patreon-event": trigger, "x-patreon-signature": bad }),
        )
      );
      assertEquals(err.message.includes(bad) || err.message.includes(good), false);
    }
    await rejects(() =>
      ingest(
        t,
        call(body.replace("Hi", "Ho").replace("Sample", "Sampl3"), trigger, SECRET, {
          "x-patreon-event": trigger,
          "x-patreon-signature": good,
        }),
      )
    );
    await rejects(() => ingest(t, call(body, trigger, SECRET, { "x-patreon-event": trigger })));
    const raw = await rejects(() =>
      ingest(
        t,
        call(undefined, trigger, SECRET, {
          "x-patreon-event": trigger,
          "x-patreon-signature": good,
        }),
      )
    );
    assertEquals(raw.message.includes("raw body"), true);
    for (const s of [null, ""]) {
      const err = await rejects(() =>
        ingest(t, call(body, trigger, s, { "x-patreon-event": trigger, "x-patreon-signature": "" }))
      );
      assertEquals(err.message.includes("secret"), true);
    }
    assert(t.output.length > 0 && t.sample !== undefined);
  });
}

test("patreon: another trigger, another campaign, or a missing event header is acknowledged with no run", async () => {
  assertEquals(evs(await ingest(memberCreated, call(MEMBER, "members:update"))), []);
  assertEquals(evs(await ingest(postDeleted, call(POST, "posts:update"))), []);
  assertEquals(evs(await ingest(memberUpdated, call(MEMBER, undefined))), [{
    trigger: "members:update",
    resourceType: "member",
    resourceId: "mem-1",
    campaignId: "123456",
    attributes: { full_name: "Sample Patron", patron_status: "active_patron" },
    relationships: { campaign: { data: { id: "123456", type: "campaign" } } },
    included: [],
  }]);
  // any-event without a header cannot say what fired: dropped, never guessed
  assertEquals(evs(await ingest(anyEvent, call(MEMBER, undefined))), []);
  // any-event honours its events filter
  const only = { campaignId: "123456", events: "posts:delete" };
  assertEquals(
    evs(await ingest(anyEvent, call(POST, "posts:publish", SECRET, undefined, only))),
    [],
  );
  assertEquals(
    evs(await ingest(anyEvent, call(POST, "posts:delete", SECRET, undefined, only))).length,
    1,
  );
  const other = call(MEMBER, "members:update");
  other.state.campaignId = "999";
  assertEquals(evs(await ingest(memberUpdated, other)), []);
});

test("patreon onSubscribe registers the literal trigger lists", async () => {
  const cases = [
    [memberCreated, {}, ["members:create"]],
    [memberUpdated, {}, ["members:update"]],
    [memberDeleted, {}, ["members:delete"]],
    [pledgeUpdated, {}, ["members:pledge:update"]],
    [pledgeDeleted, {}, ["members:pledge:delete"]],
    [postUpdated, {}, ["posts:update"]],
    [postDeleted, {}, ["posts:delete"]],
    [anyEvent, { events: "posts:publish, members:create" }, ["posts:publish", "members:create"]],
  ] as const;
  for (const [t, extra, triggers] of cases) {
    const { ctx, calls } = mockCtx([
      { status: 201, body: { data: { id: "77", attributes: { secret: SECRET } } } },
    ]);
    const state = await t.onSubscribe!({
      params: { campaignId: "123456", ...extra },
      subscriptionId: "s",
      callbackUrl: CALLBACK,
      hostUrl: "",
    }, ctx);
    assertEquals(calls[0].url, "https://www.patreon.com/api/oauth2/v2/webhooks");
    assertEquals(JSON.parse(calls[0].body!).data.attributes, { triggers, uri: CALLBACK });
    assertEquals(state, { campaignId: "123456", webhookId: "77", secret: SECRET });
  }
  const all = mockCtx([{
    status: 201,
    body: { data: { id: "78", attributes: { secret: SECRET } } },
  }]);
  await anyEvent.onSubscribe!(
    { params: { campaignId: "123456" }, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "" },
    all.ctx,
  );
  assertEquals(JSON.parse(all.calls[0].body!).data.attributes.triggers.length, 9);
  const none = mockCtx([]);
  await rejects(() =>
    anyEvent.onSubscribe!({
      params: { campaignId: "123456", events: "members:nope" },
      subscriptionId: "s",
      callbackUrl: CALLBACK,
      hostUrl: "",
    }, none.ctx)
  );
  assertEquals(none.calls.length, 0);
});

const input = { params: {}, subscriptionId: "sub" };
const camp = (id: string) => ({ id, type: "campaign", attributes: { creation_name: `c${id}` } });
const list = (data: unknown[], next?: string) => ({
  data,
  meta: { pagination: { cursors: { next: next ?? null }, total: data.length } },
});

test("patreon new-campaign: seed, new campaign once, idempotent, literal paged requests", async () => {
  const seed = mockCtx([{ body: list([camp("1")]) }]);
  const seeded = await newCampaign.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.map((c) => [c.method, c.url]), [
    ["GET", "https://www.patreon.com/api/oauth2/v2/campaigns?page%5Bcount%5D=100"],
  ]);
  const body = list([camp("1"), camp("2")]);
  const first = await newCampaign.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body }]).ctx,
  );
  assertEquals(first.events, [camp("2")]);
  const retry = await newCampaign.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body }]).ctx,
  );
  assertEquals(retry, first);
  const two = mockCtx([{ body: list([camp("1")], "cur-2") }, { body: list([camp("3")]) }]);
  const paged = await newCampaign.poll!({ ...input, state: seeded.nextState }, two.ctx);
  assertEquals(paged.events, [camp("3")]);
  assertEquals(
    two.calls[1].url,
    "https://www.patreon.com/api/oauth2/v2/campaigns?page%5Bcount%5D=100&page%5Bcursor%5D=cur-2",
  );
});
