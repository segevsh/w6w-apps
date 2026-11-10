import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-email.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const email = (id: string) => ({ id, to: ["customer@example.com"] });
const ctx = (data: unknown[]) => mockCtx([{ body: { object: "list", has_more: false, data } }]);

test("new-email seeds, emits, retries, and requests the literal bounded email page", async () => {
  const seed = ctx([email("a")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals({ method: seed.calls[0].method, url: seed.calls[0].url }, {
    method: "GET",
    url: "https://api.resend.com/emails?limit=100",
  });
  const page = [email("b"), email("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [email("b")]);
  assertEquals(retry, first);
});
