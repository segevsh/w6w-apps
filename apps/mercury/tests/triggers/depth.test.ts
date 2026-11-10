import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newTransaction from "../../triggers/new-transaction.ts";
import newAccount from "../../triggers/new-account.ts";
import newCard from "../../triggers/new-card.ts";
import newRecipient from "../../triggers/new-recipient.ts";
import newInvoice from "../../triggers/new-invoice.ts";
import newUser from "../../triggers/new-user.ts";
import newCategory from "../../triggers/new-category.ts";
import newAccountStatement from "../../triggers/new-account-statement.ts";

const API = "https://api.mercury.com/api/v1";

// One row per trigger: the response envelope key and the LITERAL request the wrapped list action sends.
const feeds = [
  {
    trigger: newTransaction,
    envelope: "transactions",
    params: {},
    url: `${API}/transactions?limit=100&order=desc`,
  },
  {
    trigger: newAccount,
    envelope: "accounts",
    params: {},
    url: `${API}/accounts?limit=100&order=desc`,
  },
  { trigger: newCard, envelope: "cards", params: {}, url: `${API}/cards?limit=100&order=desc` },
  {
    trigger: newRecipient,
    envelope: "recipients",
    params: {},
    url: `${API}/recipients?limit=100&order=desc`,
  },
  {
    trigger: newInvoice,
    envelope: "invoices",
    params: {},
    url: `${API}/ar/invoices?limit=100&order=desc`,
  },
  { trigger: newUser, envelope: "users", params: {}, url: `${API}/users?limit=100&order=desc` },
  {
    trigger: newCategory,
    envelope: "categories",
    params: {},
    url: `${API}/categories?limit=100&order=desc`,
  },
  {
    trigger: newAccountStatement,
    envelope: "statements",
    params: { accountId: "account-1" },
    url: `${API}/account/account-1/statements?limit=100&order=desc`,
  },
];

for (const { trigger, envelope, params, url } of feeds) {
  test(`${trigger.key}: seeds, emits only the new record, retries identically, sends its literal request`, async () => {
    const body = (...ids: string[]) => ({ [envelope]: ids.map((id) => ({ id })), page: {} });
    const at = (state: unknown) => ({ params, state, subscriptionId: "sub-1" });
    const seed = mockCtx([{ body: body("old") }]);
    const seeded = await trigger.poll!(at({}), seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, url);
    const first = await trigger.poll!(
      at(seeded.nextState),
      mockCtx([{ body: body("new", "old") }]).ctx,
    );
    const retry = await trigger.poll!(
      at(seeded.nextState),
      mockCtx([{ body: body("new", "old") }]).ctx,
    );
    assertEquals(first.events, [{ id: "new" }]);
    assertEquals(retry, first);
  });
}
