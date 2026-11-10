import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-contact.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const contact = (id: string, updated: string) => ({
  ContactID: id,
  Name: `Contact ${id}`,
  UpdatedDateUTC: updated,
});
const page = (...contacts: unknown[]) => mockCtx([{ body: { Contacts: contacts } }]);

test("new-or-updated-contact: seeds with no events and requests UpdatedDateUTC DESC", async () => {
  const seed = page(contact("a", "/Date(1000+0000)/"));
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.xero.com/api.xro/2.0/Contacts?order=UpdatedDateUTC+DESC&page=1",
  );
});

test("new-or-updated-contact: emits only the new contact, and the retry is identical", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    page(contact("a", "/Date(1000+0000)/")).ctx,
  );
  const rows = [contact("b", "/Date(2000+0000)/"), contact("a", "/Date(1000+0000)/")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, page(...rows).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, page(...rows).ctx);
  assertEquals(first.events, [contact("b", "/Date(2000+0000)/")]);
  assertEquals(retry, first);
});

test("new-or-updated-contact: an edited contact is a new event, an untouched one is not", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    page(contact("a", "/Date(1000+0000)/")).ctx,
  );
  const edited = await trigger.poll!(
    { ...input, state: seeded.nextState },
    page(contact("a", "/Date(3000+0000)/")).ctx,
  );
  assertEquals(edited.events, [contact("a", "/Date(3000+0000)/")]);
  const untouched = await trigger.poll!(
    { ...input, state: edited.nextState },
    page(contact("a", "/Date(3000+0000)/")).ctx,
  );
  assertEquals(untouched.events, []);
});
