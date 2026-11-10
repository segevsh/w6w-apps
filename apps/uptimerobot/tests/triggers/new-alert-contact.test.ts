import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-alert-contact.ts";

const contact = (id: string) => ({ id, friendly_name: `c${id}`, type: 2, status: 2 });
const ok = (ids: string[]) => ({ body: { stat: "ok", alert_contacts: ids.map(contact) } });
const poll = async (state: unknown, responses: Array<{ body: unknown }>) => {
  const m = mockCtx(responses);
  const r = await trigger.poll!({ params: {}, state, subscriptionId: "s" }, m.ctx);
  return { r, calls: m.calls };
};

test("new-alert-contact: seeds, emits only added contacts, retries idempotently, literal request", async () => {
  const seeded = await poll({}, [ok(["1"])]);
  assertEquals(seeded.r.events, []);
  assertEquals((seeded.r.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seeded.calls[0].method, "POST");
  assertEquals(seeded.calls[0].url, "https://api.uptimerobot.com/v2/getAlertContacts");
  assertEquals(seeded.calls[0].body, "limit=50&offset=0");
  const first = await poll(seeded.r.nextState, [ok(["1", "2"])]);
  const retry = await poll(seeded.r.nextState, [ok(["1", "2"])]);
  assertEquals(first.r.events, [contact("2")]);
  assertEquals(retry.r, first.r);
});

test("new-alert-contact: reads every page of a collection larger than 50 contacts", async () => {
  const full = Array.from({ length: 50 }, (_, i) => String(i + 1));
  const seeded = await poll({}, [ok(full), ok(["51"])]);
  assertEquals(seeded.calls.map((c) => c.body), ["limit=50&offset=0", "limit=50&offset=50"]);
  const next = await poll(seeded.r.nextState, [ok(full), ok(["51", "52"])]);
  assertEquals(next.r.events, [contact("52")]);
});
