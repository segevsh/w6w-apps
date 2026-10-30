import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import account from "../../health/account.ts";
import { envelope, mockWrikeCtx } from "../_helpers.ts";

test("health/account: ok when subscription.suspended is false", async () => {
  const { ctx } = mockWrikeCtx([
    {
      status: 200,
      body: envelope([{ id: "A1", name: "Acme", subscription: { suspended: false } }]),
    },
  ]);
  const report = await account.check!({}, ctx);
  assertEquals(report.state, "ok");
});

test("health/account: down when subscription.suspended is true, names the account", async () => {
  const { ctx } = mockWrikeCtx([
    {
      status: 200,
      body: envelope([{ id: "A1", name: "Acme", subscription: { suspended: true } }]),
    },
  ]);
  const report = await account.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.message?.includes("Acme"), true);
});

test("health/account: unknown when the field is absent — never guessed as down", async () => {
  const { ctx } = mockWrikeCtx([{ status: 200, body: envelope([{ id: "A1" }]) }]);
  const report = await account.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

test("health/account: unknown when the connection carries no host", async () => {
  const { ctx } = mockWrikeCtx([]);
  (ctx as unknown as { connection: unknown }).connection = { display: {} };
  const report = await account.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

test("health/account: is unsigned-safe metadata — credential posture is signed, kind is credential", () => {
  assertEquals(account.kind, "credential");
  assertEquals(account.credential, "signed");
  assertEquals(account.scope, "connection");
});
