import assert from "node:assert/strict";
import test from "node:test";
import anyEvent from "../../triggers/any-event.ts";
import campaignLinkClicked from "../../triggers/campaign-link-clicked.ts";
import campaignOpened from "../../triggers/campaign-opened.ts";
import campaignSent from "../../triggers/campaign-sent.ts";
import contactTagAdded from "../../triggers/contact-tag-added.ts";
import contactTagRemoved from "../../triggers/contact-tag-removed.ts";
import contactUnsubscribed from "../../triggers/contact-unsubscribed.ts";
import contactUpdated from "../../triggers/contact-updated.ts";
import dealAdded from "../../triggers/deal-added.ts";
import dealUpdated from "../../triggers/deal-updated.ts";
import emailBounced from "../../triggers/email-bounced.ts";
import app from "../../index.ts";
import { mockActiveCampaignCtx } from "../_helpers.ts";

const CALLBACK = "https://w6w.example/triggers/webhooks/sub_123";
const API = "https://acme.api-us1.com/api/3";
const SECRET = "test-secret-0123456789abcdef";
const HEADER = "X-W6W-Webhook-Secret";
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

const post = (body: unknown, headers: Record<string, string> = { [HEADER]: SECRET }) => ({
  method: "POST",
  path: "/",
  query: {},
  headers,
  body,
});

// Field names from https://developers.activecampaign.com/page/webhooks (verified 2026-11-10).
const CONTACT = "&contact[id]=42&contact[email]=ada%40example.com&contact[first_name]=Ada";
const CASES = [
  { t: contactUpdated, ev: "update", form: `type=update${CONTACT}&contact[fields][3]=x` },
  { t: contactUnsubscribed, ev: "unsubscribe", form: `type=unsubscribe${CONTACT}&campaign[id]=9` },
  { t: contactTagAdded, ev: "contact_tag_added", form: `type=contact_tag_added${CONTACT}&tag=vip` },
  { t: contactTagRemoved, ev: "contact_tag_removed", form: `type=contact_tag_removed${CONTACT}` },
  {
    t: dealAdded,
    ev: "deal_add",
    form: "type=deal_add&deal[id]=7&deal[title]=Annual&deal[value]=5000&deal[stageid]=2",
  },
  { t: dealUpdated, ev: "deal_update", form: "type=deal_update&deal[id]=7&deal[title]=Annual" },
  { t: campaignSent, ev: "sent", form: "type=sent&campaign[id]=12&campaign[status]=5" },
  { t: campaignOpened, ev: "open", form: `type=open&campaign[id]=12${CONTACT}` },
  {
    t: campaignLinkClicked,
    ev: "click",
    form: `type=click&campaign[id]=12&link[url]=https%3A%2F%2Fx.test${CONTACT}`,
  },
  {
    t: emailBounced,
    ev: "bounce",
    form: `type=bounce&campaign[id]=12&bounce[type]=hard${CONTACT}`,
  },
] as const;

for (const c of CASES) {
  const t = c.t;
  const state = { webhookId: "9", secret: SECRET, events: [c.ev] };

  test(`${t.key}: registers exactly ${c.ev} with a secret signature header, replacing a leftover`, async () => {
    const { ctx, calls } = mockActiveCampaignCtx([
      { body: { webhooks: [{ id: "7", url: CALLBACK }, { id: "8", url: "https://other.test/" }] } },
      { body: {} },
      { body: { webhook: { id: "9" } } },
    ]);
    const st = await t.onSubscribe!({ params: {}, callbackUrl: CALLBACK }, ctx) as {
      webhookId: string;
      secret: string;
      events: string[];
    };
    assert.match(st.secret, /^[0-9a-f]{64}$/);
    assert.deepEqual({ webhookId: st.webhookId, events: st.events }, {
      webhookId: "9",
      events: [c.ev],
    });
    assert.deepEqual(calls.map(({ method, url }) => [method, url]), [
      ["GET", `${API}/webhooks`],
      ["DELETE", `${API}/webhooks/7`],
      ["POST", `${API}/webhooks`],
    ]);
    assert.deepEqual(JSON.parse(calls[2].body!), {
      webhook: {
        name: `w6w ${t.title}`,
        url: CALLBACK,
        events: [c.ev],
        sources: ["admin", "api", "public", "system"],
        headers: [{ name: HEADER, value: st.secret, is_signature: true }],
      },
    });
  });

  test(`${t.key}: delivers its form-encoded event, drops another event, refuses a wrong or missing secret`, async () => {
    const out = evs(await t.handleIngest!({ raw: post(c.form), state } as never)) as Array<
      Record<string, unknown>
    >;
    assert.equal(out.length, 1);
    assert.equal(out[0].type, c.ev);
    assert.equal((out[0].data as Record<string, unknown>).type, c.ev);
    // a delivery of another event on this URL starts nothing
    assert.deepEqual(
      evs(await t.handleIngest!({ raw: post("type=zzz_other"), state } as never)),
      [],
    );

    // the secret header differs by ONE byte, is absent, or is not the stored one
    const flipped = SECRET.slice(0, -1) + "0";
    for (const headers of [{ [HEADER]: flipped }, {}, { "X-Other": SECRET }]) {
      await assert.rejects(
        async () => await t.handleIngest!({ raw: post(c.form, headers), state } as never),
        (e: Error) => /refused/.test(e.message) && !e.message.includes(SECRET),
      );
    }
    // no stored secret: refused before any compare, even against an empty header
    for (const bad of [undefined, "", 5]) {
      await assert.rejects(
        async () =>
          await t.handleIngest!({
            raw: post(c.form, { [HEADER]: "" }),
            state: { ...state, secret: bad },
          } as never),
        /secret/,
      );
    }
    await assert.rejects(
      async () =>
        await t.handleIngest!({ raw: { ...post(c.form), method: "GET" }, state } as never),
      /POST/,
    );
  });
}

test("contact and deal fields are parsed out of the form body", async () => {
  const out = evs(
    await contactUpdated.handleIngest!({
      raw: post(`type=update&date_time=2026-11-10T10%3A00%3A00-06%3A00&initiated_by=api${CONTACT}`),
      state: { webhookId: "1", secret: SECRET, events: ["update"] },
    } as never),
  ) as Array<Record<string, unknown>>;
  assert.deepEqual(out[0].contact, { id: "42", email: "ada@example.com", first_name: "Ada" });
  assert.equal(out[0].dateTime, "2026-11-10T10:00:00-06:00");
  assert.equal(out[0].initiatedBy, "api");
  assert.equal(out[0].deal, null);
});

// ---- any-event ----

test("any-event: empty events registers all 30 documented events; a chosen list is deduped", async () => {
  const all = mockActiveCampaignCtx([{ body: { webhooks: [] } }, {
    body: { webhook: { id: "5" } },
  }]);
  const st = await anyEvent.onSubscribe!({ params: {}, callbackUrl: CALLBACK }, all.ctx) as {
    events: string[];
  };
  assert.equal(st.events.length, 30);
  assert.deepEqual(JSON.parse(all.calls[1].body!).webhook.events, st.events);
  assert.equal(JSON.parse(all.calls[1].body!).webhook.name, "w6w Any Event");

  const some = mockActiveCampaignCtx([{ body: { webhooks: [] } }, {
    body: { webhook: { id: "6" } },
  }]);
  await anyEvent.onSubscribe!(
    { params: { events: "deal_add, sms_reply,deal_add" }, callbackUrl: CALLBACK },
    some.ctx,
  );
  assert.deepEqual(JSON.parse(some.calls[1].body!).webhook.events, ["deal_add", "sms_reply"]);
});

test("any-event: an unknown event is refused before any request", async () => {
  const none = mockActiveCampaignCtx([]);
  await assert.rejects(
    anyEvent.onSubscribe!({ params: { events: "deal_add,nope" }, callbackUrl: CALLBACK }, none.ctx),
    /Unknown ActiveCampaign webhook event/,
  );
  assert.equal(none.calls.length, 0);
});

test("any-event: delivers only the registered events (the filter), checks the secret first", async () => {
  const state = { webhookId: "5", secret: SECRET, events: ["deal_add", "sms_reply"] };
  const hit = evs(
    await anyEvent.handleIngest!({ raw: post("type=sms_reply&contact[id]=1"), state } as never),
  );
  assert.equal(hit.length, 1);
  assert.deepEqual(
    evs(await anyEvent.handleIngest!({ raw: post("type=bounce"), state } as never)),
    [],
  );
  const flipped = SECRET.slice(0, -1) + "0";
  await assert.rejects(
    async () =>
      await anyEvent.handleIngest!(
        { raw: post("type=sms_reply", { [HEADER]: flipped }), state } as never,
      ),
    /refused/,
  );
  await assert.rejects(
    async () => await anyEvent.handleIngest!({ raw: post("type=sms_reply", {}), state } as never),
    /refused/,
  );
  await assert.rejects(
    async () =>
      await anyEvent.handleIngest!(
        { raw: post("type=sms_reply"), state: { ...state, secret: "" } } as never,
      ),
    /secret/,
  );
  await assert.rejects(
    async () => await anyEvent.handleIngest!({ raw: post("x=1"), state } as never),
    /expected a type/,
  );
});

test("onUnsubscribe of an event trigger deletes the stored webhook; 410 means gone", async () => {
  const ok = mockActiveCampaignCtx([{ body: {} }]);
  await anyEvent.onUnsubscribe!({
    params: {},
    state: { webhookId: "5", secret: SECRET, events: [] },
  }, ok.ctx);
  assert.deepEqual(ok.calls.map(({ method, url }) => [method, url]), [[
    "DELETE",
    `${API}/webhooks/5`,
  ]]);
  const gone = mockActiveCampaignCtx([{ status: 410, statusText: "Gone", body: {} }]);
  await anyEvent.onUnsubscribe!({
    params: {},
    state: { webhookId: "5", secret: SECRET, events: [] },
  }, gone.ctx);
});

test("the app ships exactly these sixteen triggers, each with output and a sample", () => {
  const keys = (app.triggers ?? []).map((t) => t.key).sort();
  assert.deepEqual(keys, [
    "any-event",
    "campaign-link-clicked",
    "campaign-opened",
    "campaign-sent",
    "contact-tag-added",
    "contact-tag-removed",
    "contact-unsubscribed",
    "contact-updated",
    "deal-added",
    "deal-updated",
    "email-bounced",
    "new-automation",
    "new-contact",
    "new-or-updated-automation",
    "new-or-updated-contact",
    "new-sent-campaign",
  ]);
  for (const t of app.triggers ?? []) {
    assert.ok((t.output?.length ?? 0) > 0, t.key);
    assert.ok(t.sample !== undefined, t.key);
    if (typeof t.poll === "function") assert.equal(t.onSubscribe, undefined, t.key);
  }
});
