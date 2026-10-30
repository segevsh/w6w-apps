import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import accountPauseBulk from "../../actions/account-pause-bulk.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("account-pause-bulk: POSTs /accounts/pause with the email list", async () => {
  const { ctx, calls } = mockCtx([
    { body: { paused_emails: ["a@b.com"], failed_emails: [] } },
  ]);
  const out = await accountPauseBulk.execute(
    { emails: ["a@b.com"] },
    ctx,
  ) as { paused_emails: string[] };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/accounts/pause");
  assertEquals(JSON.parse(calls[0].body!), { emails: ["a@b.com"] });
  assertEquals(out.paused_emails, ["a@b.com"]);
});

test("account-pause-bulk: emails accepts a comma string", async () => {
  const { ctx, calls } = mockCtx([{ body: { paused_emails: [], failed_emails: [] } }]);
  await accountPauseBulk.execute({ emails: "a@b.com, c@d.com" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).emails, ["a@b.com", "c@d.com"]);
});

test("account-pause-bulk: is declared idempotent — an already-paused account just reports again", () => {
  assertEquals(accountPauseBulk.idempotent, true);
});
