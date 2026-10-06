import { assert, assertEquals, assertRejects } from "@std/assert";
import { MailerooClient, pageInfo, seg, vendorMessage } from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: send() targets the Email API host, account() the Account API host", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { a: 1 } } }, { body: { data: { b: 2 } } }]);
  const c = new MailerooClient(ctx);
  assertEquals((await c.send("/emails/scheduled", { query: { page: 2, domain: "" } })).data, {
    a: 1,
  });
  assertEquals((await c.account("/account")).data, { b: 2 });
  assertEquals(calls[0].url, "https://smtp.maileroo.com/api/v2/emails/scheduled?page=2");
  assertEquals(calls[1].url, "https://api.maileroo.com/v1/account");
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("client: a body means POST with a JSON content type", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: null } }]);
  await new MailerooClient(ctx).account("/suppressions", { body: { email_address: "a@b.co" } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { email_address: "a@b.co" });
});

Deno.test("client: success:false throws even under HTTP 200 (Email API shape)", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { success: false, message: "bad domain" } }]);
  await assertRejects(() => new MailerooClient(ctx).send("/emails"), Error, "bad domain");
});

Deno.test("client: Account API errors carry error.message plus a scope hint on 403", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { error: { message: "no scope" } } }]);
  const err = await assertRejects(() => new MailerooClient(ctx).account("/domains"), Error);
  assert(err.message.includes("no scope") && err.message.includes("scope"));
  assert(err.message.includes("403"));
});

Deno.test("client helpers: vendorMessage, seg and pageInfo", () => {
  assertEquals(vendorMessage({ message: "m" }), "m");
  assertEquals(vendorMessage({ error: { message: "e" } }), "e");
  assertEquals(vendorMessage("x"), undefined);
  assertEquals(seg("user@example.com", "id"), "user%40example.com");
  assertEquals(pageInfo({ page: 1, per_page: 25, total: 60, total_pages: 3 }).hasMore, true);
  assertEquals(pageInfo({ page: 3, total_pages: 3 }).hasMore, false);
});
