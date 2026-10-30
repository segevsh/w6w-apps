import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import accountCreate from "../../actions/account-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const BASE = {
  email: "a@b.com",
  first_name: "Jon",
  last_name: "Doe",
  provider_code: 1,
  imap_username: "a@b.com",
  imap_password: "imap-secret",
  imap_host: "imap.example.com",
  imap_port: 993,
  smtp_username: "a@b.com",
  smtp_password: "smtp-secret",
  smtp_host: "smtp.example.com",
  smtp_port: 465,
};

test("account-create: POSTs /accounts with the IMAP/SMTP fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { email: "a@b.com", status: 1 } }]);
  const out = await accountCreate.execute(BASE, ctx) as { email: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/accounts");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.imap_password, "imap-secret");
  assertEquals(body.smtp_password, "smtp-secret");
  assertEquals(out.email, "a@b.com");
});

test("account-create: warmup config accepts a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await accountCreate.execute({ ...BASE, warmup: '{"limit":100}' }, ctx);
  assertEquals(JSON.parse(calls[0].body!).warmup, { limit: 100 });
});

test("account-create: never touches this app's OWN Instantly credential", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await accountCreate.execute(BASE, ctx);
  assert(!calls[0].headers.authorization?.includes("imap-secret"));
  assert(!calls[0].headers.authorization?.includes("smtp-secret"));
});

test("account-create: is declared non-idempotent", () => {
  assertEquals(accountCreate.idempotent, false);
});
