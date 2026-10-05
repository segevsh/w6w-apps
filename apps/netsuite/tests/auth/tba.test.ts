import { assertEquals, assertRejects } from "@std/assert";
import tba from "../../auth/tba.ts";
import { BASE, mockCtx, nsError } from "../_helpers.ts";

const cred = {
  accountId: "1234567",
  consumerKey: "ck",
  consumerSecret: "cs",
  tokenId: "ti",
  tokenSecret: "ts",
};

Deno.test("tba: sign sets an OAuth 1.0a HMAC-SHA256 header with the upper-case realm", async () => {
  const out = await tba.sign!({
    request: {
      url: `${BASE}/services/rest/record/v1/customer?limit=2`,
      method: "GET",
      headers: {},
    },
    credential: { ...cred, accountId: "1234567-sb1" },
  } as never, {} as never);
  const h = out.headers["authorization"];
  assertEquals(h.startsWith("OAuth "), true);
  assertEquals(h.includes('oauth_signature_method="HMAC-SHA256"'), true);
  assertEquals(h.includes('realm="1234567_SB1"'), true);
  assertEquals(h.includes('oauth_consumer_key="ck"'), true);
  assertEquals(h.includes('oauth_token="ti"'), true);
});

Deno.test("tba: sign refuses any other host", async () => {
  await assertRejects(
    async () =>
      await tba.sign!({
        request: { url: "https://evil.example.com/", method: "GET", headers: {} },
        credential: cred,
      } as never, {} as never),
    Error,
    "non-SuiteTalk",
  );
});

Deno.test("tba: test passes on serverTime and sends a signed header", async () => {
  const { ctx, calls } = mockCtx([{ body: { serverTime: "2025-03-26T16:21:00.000Z" } }]);
  assertEquals(await tba.test!({ credential: cred } as never, ctx), { ok: true });
  assertEquals(calls[0].headers["authorization"].startsWith("OAuth "), true);
});

Deno.test("tba: test failure is classified from the body", async () => {
  const { ctx } = mockCtx([nsError(401, "INVALID_LOGIN", "Invalid login attempt.")]);
  const r = await tba.test!({ credential: cred } as never, ctx);
  assertEquals(r.ok, false);
  assertEquals(r.message?.startsWith("INVALID_LOGIN"), true);
});

Deno.test("tba: test refuses an incomplete credential or bad account id without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(
    (await tba.test!({ credential: { ...cred, tokenSecret: "" } } as never, ctx)).ok,
    false,
  );
  assertEquals(
    (await tba.test!({ credential: { ...cred, accountId: "x.evil.com/" } } as never, ctx)).ok,
    false,
  );
  assertEquals(calls.length, 0);
});

Deno.test("tba: afterConnect records the normalised account id", async () => {
  const out = await tba.afterConnect!(
    { credential: { accountId: "1234567_SB1" } } as never,
    {} as never,
  );
  assertEquals(out, { accountId: "1234567-sb1" });
});
