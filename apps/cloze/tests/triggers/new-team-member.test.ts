import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-team-member.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const member = (email: string) => ({ name: `Member ${email}`, email });
const page = (...m: unknown[]) => mockCtx([{ body: { errorcode: 0, list: m } }]);

test("new-team-member: seeds, emits only added members, retries idempotently", async () => {
  const seed = page(member("a@example.com"), member("b@example.com"));
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://api.cloze.com/v1/team/members/list");

  const rows = [member("a@example.com"), member("b@example.com"), member("c@example.com")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, page(...rows).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, page(...rows).ctx);
  assertEquals(first.events, [member("c@example.com")]);
  assertEquals(retry, first);
});

test("new-team-member: a removed or renamed member does not emit", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    page(member("a@example.com"), member("b@example.com")).ctx,
  );
  const renamed = { name: "Renamed", email: "a@example.com" };
  const next = await trigger.poll!({ ...input, state: seeded.nextState }, page(renamed).ctx);
  assertEquals(next.events, []);
});
