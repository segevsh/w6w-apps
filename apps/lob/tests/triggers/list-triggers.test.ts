import { describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newPostcard from "../../triggers/new-postcard.ts";
import newLetter from "../../triggers/new-letter.ts";
import newSelfMailer from "../../triggers/new-self-mailer.ts";
import newCheck from "../../triggers/new-check.ts";
import newTemplate from "../../triggers/new-template.ts";
import newBankAccount from "../../triggers/new-bank-account.ts";

const sortQuery = "sort_by%5Bdate_created%5D=desc";
const cases = [
  {
    name: "new-postcard",
    trigger: newPostcard,
    url: `https://api.lob.com/v1/postcards?limit=100&${sortQuery}`,
    prefix: "psc",
  },
  {
    name: "new-letter",
    trigger: newLetter,
    url: `https://api.lob.com/v1/letters?limit=100&${sortQuery}`,
    prefix: "ltr",
  },
  {
    name: "new-self-mailer",
    trigger: newSelfMailer,
    url: `https://api.lob.com/v1/self_mailers?limit=100&${sortQuery}`,
    prefix: "sfm",
  },
  {
    name: "new-check",
    trigger: newCheck,
    url: `https://api.lob.com/v1/checks?limit=100&${sortQuery}`,
    prefix: "chk",
  },
  {
    name: "new-template",
    trigger: newTemplate,
    url: "https://api.lob.com/v1/templates?limit=100",
    prefix: "tmpl",
  },
  {
    name: "new-bank-account",
    trigger: newBankAccount,
    url: "https://api.lob.com/v1/bank_accounts?limit=100",
    prefix: "bank",
  },
];

const response = (data: unknown[]) => ({
  body: { data, count: data.length, next_url: null, previous_url: null },
});

for (const c of cases) {
  describe(c.name, () => {
    const input = { params: {}, subscriptionId: "sub-1" };
    const old = { id: `${c.prefix}_1` };
    const fresh = { id: `${c.prefix}_2` };

    test("seeds without events and requests the literal newest-first page", async () => {
      const seed = mockCtx([response([old])]);
      const seeded = await c.trigger.poll!({ ...input, state: {} }, seed.ctx);
      assertEquals(seeded.events, []);
      assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
      assertEquals(seed.calls.length, 1);
      assertEquals(seed.calls[0].method, "GET");
      assertEquals(seed.calls[0].url, c.url);
    });

    test("emits only the new record, and a retry gives the same result", async () => {
      const seeded = await c.trigger.poll!(
        { ...input, state: {} },
        mockCtx([response([old])]).ctx,
      );
      const first = await c.trigger.poll!(
        { ...input, state: seeded.nextState },
        mockCtx([response([fresh, old])]).ctx,
      );
      const retry = await c.trigger.poll!(
        { ...input, state: seeded.nextState },
        mockCtx([response([fresh, old])]).ctx,
      );
      assertEquals(first.events, [fresh]);
      assertEquals(retry, first);
    });
  });
}

test("new-bank-account never carries the account number", async () => {
  const seeded = await newBankAccount.poll!(
    { params: {}, subscriptionId: "s", state: {} },
    mockCtx([response([{ id: "bank_1" }])]).ctx,
  );
  const next = await newBankAccount.poll!(
    { params: {}, subscriptionId: "s", state: seeded.nextState },
    mockCtx([
      response([{ id: "bank_2", routing_number: "000000000", account_number: "123456789" }]),
    ])
      .ctx,
  );
  assertEquals(next.events.length, 1);
  assertEquals("account_number" in (next.events[0] as object), false);
});
