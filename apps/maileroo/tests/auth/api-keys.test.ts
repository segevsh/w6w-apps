import { assert, assertEquals, assertThrows } from "@std/assert";
import apiKeys from "../../auth/api-keys.ts";
import { mockCtx } from "../_helpers.ts";

const both = { sendingKey: "SEND-SECRET", accountKey: "ACCT-SECRET" };
const req = (url: string) => ({ url, method: "GET", headers: {} as Record<string, string> });

Deno.test("api-keys: sign stamps the sending key as X-Api-Key on the Email API host", async () => {
  const { ctx } = mockCtx();
  const out = await apiKeys.sign!({
    request: req("https://smtp.maileroo.com/api/v2/emails"),
    credential: { sendingKey: " SEND-SECRET ", accountKey: "ACCT-SECRET" },
  }, ctx);
  assertEquals(out.headers["x-api-key"], "SEND-SECRET");
  assertEquals(out.headers.authorization, undefined);
});

Deno.test("api-keys: sign stamps the account key as a bearer on the Account API host", async () => {
  const { ctx } = mockCtx();
  const out = await apiKeys.sign!({
    request: req("https://api.maileroo.com/v1/account"),
    credential: both,
  }, ctx);
  assertEquals(out.headers.authorization, "Bearer ACCT-SECRET");
  assertEquals(out.headers["x-api-key"], undefined);
});

Deno.test("api-keys: sign names the missing key instead of sending nothing", () => {
  const { ctx } = mockCtx();
  assertThrows(
    () =>
      apiKeys.sign!({
        request: req("https://smtp.maileroo.com/api/v2/emails"),
        credential: { accountKey: "A" },
      }, ctx),
    Error,
    "Sending Key",
  );
  assertThrows(
    () =>
      apiKeys.sign!({
        request: req("https://api.maileroo.com/v1/account"),
        credential: { sendingKey: "S" },
      }, ctx),
    Error,
    "Account API Key",
  );
});

Deno.test("api-keys: test probes each supplied key on its own host and passes", async () => {
  const { ctx, calls } = mockCtx([
    { body: { success: true, data: { results: [] } } },
    { body: { data: { user_id: 1 } } },
  ]);
  const res = await apiKeys.test!({ credential: both }, ctx);
  assertEquals(res.ok, true);
  assertEquals(calls[0].url, "https://smtp.maileroo.com/api/v2/emails/scheduled");
  assertEquals(calls[0].headers["x-api-key"], "SEND-SECRET");
  assertEquals(calls[1].url, "https://api.maileroo.com/v1/account");
  assertEquals(calls[1].headers.authorization, "Bearer ACCT-SECRET");
});

Deno.test("api-keys: an app-scoped key's 'linked domain' 400 and a scope 403 both prove the key", async () => {
  const sendOnly = mockCtx([{
    status: 400,
    body: {
      success: false,
      message: "You are using an app-based sending API key and must provide a linked domain.",
    },
  }]);
  assertEquals((await apiKeys.test!({ credential: { sendingKey: "S" } }, sendOnly.ctx)).ok, true);
  const acct = mockCtx([{
    status: 403,
    body: { error: { message: "Your API key does not have the required scope" } },
  }]);
  const res = await apiKeys.test!({ credential: { accountKey: "A" } }, acct.ctx);
  assertEquals(res.ok, true);
  assert(res.message?.includes("account.read"));
});

Deno.test("api-keys: rejections are failures and never echo a key", async () => {
  const send = mockCtx([{
    status: 401,
    body: { success: false, message: "You have used an invalid API key." },
  }]);
  const r1 = await apiKeys.test!({ credential: both }, send.ctx);
  assertEquals(r1.ok, false);
  assert(!r1.message?.includes("SEND-SECRET"));

  const acct = mockCtx([{
    status: 401,
    body: { error: { message: "The API key you provided is invalid or has been revoked." } },
  }]);
  const r2 = await apiKeys.test!({ credential: { accountKey: "ACCT-SECRET" } }, acct.ctx);
  assertEquals(r2.ok, false);
  assert(!r2.message?.includes("ACCT-SECRET"));

  const ip = mockCtx([{
    status: 403,
    body: { error: { message: "Your IP address is not authorized to use this API key." } },
  }]);
  assertEquals((await apiKeys.test!({ credential: { accountKey: "A" } }, ip.ctx)).ok, false);

  const busy = mockCtx([{ status: 429, body: { error: { message: "slow" } } }]);
  assert(
    (await apiKeys.test!({ credential: { accountKey: "A" } }, busy.ctx)).message?.includes(
      "rate-limited",
    ),
  );
  const down = mockCtx([{ status: 503, body: "oops" }]);
  assert(
    (await apiKeys.test!({ credential: { accountKey: "A" } }, down.ctx)).message?.includes("503"),
  );
  const odd = mockCtx([{ status: 404, body: { error: { message: "nope" } } }]);
  assertEquals((await apiKeys.test!({ credential: { accountKey: "A" } }, odd.ctx)).ok, false);
});

Deno.test("api-keys: no key at all is a failure without a request", async () => {
  const none = mockCtx();
  assertEquals((await apiKeys.test!({ credential: { sendingKey: " " } }, none.ctx)).ok, false);
  assertEquals(none.calls.length, 0);
});
