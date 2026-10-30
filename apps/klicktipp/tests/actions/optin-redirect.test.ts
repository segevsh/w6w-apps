import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/optin-redirect.ts";

test("optin-redirect: POSTs listid and email", async () => {
  const { ctx, calls } = mockCtx([{ body: ["https://pending.example"] }]);
  const out = await action.execute({ listId: 45, email: "a@example.com" }, ctx);
  assertEquals(calls[0].url, "https://api.klicktipp.com/list/redirect");
  assertEquals(JSON.parse(calls[0].body!), { listid: "45", email: "a@example.com" });
  assertEquals(out, { urls: ["https://pending.example"], url: "https://pending.example" });
});

test("optin-redirect: 404 is reported", async () => {
  const { ctx } = mockCtx([{ status: 404, body: ["There is no such entity."] }]);
  await assertRejects(
    async () => await action.execute({ listId: 1, email: "a@example.com" }, ctx),
    Error,
    "no such entity",
  );
});
