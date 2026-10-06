import { assertEquals, assertRejects } from "@std/assert";
import action, { buildRecipients } from "../../actions/email-send-bulk.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("email-send-bulk: POST /emails with per-recipient Fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { TransactionID: "t2", MessageID: "m2" } }]);
  const out = await action.execute({
    recipients: [{ email: "a@x.com", fields: { firstname: "Ada" } }, "b@x.com"],
    subject: "Hello {firstname}",
    bodyHtml: "<p>{firstname}</p>",
  }, ctx) as { TransactionID: string };
  assertEquals(out.TransactionID, "t2");
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v4/emails");
  assertEquals(JSON.parse(calls[0].body!).Recipients, [
    { Email: "a@x.com", Fields: { firstname: "Ada" } },
    { Email: "b@x.com" },
  ]);
  assertEquals(JSON.parse(calls[0].body!).Content.Subject, "Hello {firstname}");
});

Deno.test("email-send-bulk: recipients accept a comma string or a JSON string; bad input throws", async () => {
  assertEquals(buildRecipients("a@x.com, b@x.com"), [{ Email: "a@x.com" }, { Email: "b@x.com" }]);
  assertEquals(buildRecipients('[{"Email":"a@x.com","Fields":{"k":"v"}}]'), [
    { Email: "a@x.com", Fields: { k: "v" } },
  ]);
  await assertRejects(
    async () => await action.execute({ recipients: [], bodyText: "x" }, mockCtx().ctx),
    Error,
    "non-empty",
  );
  await assertRejects(
    async () =>
      await action.execute({ recipients: [{ fields: {} }], bodyText: "x" }, mockCtx().ctx),
    Error,
    "non-empty",
  );
});
