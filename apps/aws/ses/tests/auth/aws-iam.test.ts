import { assertEquals, assertMatch, assertNotEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/aws-iam.ts";
import { computeSigV4 } from "../../lib/sigv4.ts";

const CRED = {
  accessKeyId: "AKIDEXAMPLE",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
  region: "us-east-1",
};

interface Req {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}
type Signed = Req & { headers: Record<string, string> };

const sign = (request: Req, credential: unknown = CRED) =>
  Promise.resolve(auth.sign!({ request, credential }, mockCtx().ctx)) as Promise<Signed>;

Deno.test("auth: declares a custom `aws-iam` method with region and an optional session token", () => {
  assertEquals(auth.key, "aws-iam");
  assertEquals(auth.type, "custom");
  const byKey = Object.fromEntries((auth.fields ?? []).map((f) => [f.key, f]));
  assertEquals(Object.keys(byKey), ["accessKeyId", "secretAccessKey", "region", "sessionToken"]);
  assertEquals(byKey.accessKeyId.type, "secret");
  assertEquals(byKey.secretAccessKey.type, "secret");
  assertEquals(byKey.sessionToken.type, "secret");
  assertEquals(byKey.sessionToken.required, false);
  assertEquals(byKey.region.default, "us-east-1");
});

Deno.test("auth.sign: signs for the `ses` service, host + x-amz-date + content-type, no content-sha header", async () => {
  const req = {
    url: "https://email.us-east-1.amazonaws.com/v2/email/outbound-emails",
    method: "POST",
    headers: { "content-type": "application/json" },
    body: '{"a":1}',
  };
  const signed = await sign(req);
  assertMatch(
    signed.headers.authorization,
    /^AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE\/\d{8}\/us-east-1\/ses\/aws4_request, SignedHeaders=content-type;host;x-amz-date, Signature=[0-9a-f]{64}$/,
  );
  assertEquals(signed.headers.host, "email.us-east-1.amazonaws.com");
  assertEquals("x-amz-content-sha256" in signed.headers, false);
  assertEquals(signed.body, '{"a":1}');
  assertEquals(signed.url, req.url);
});

Deno.test("auth.sign: the signature is reproducible from the stamped x-amz-date", async () => {
  const req = {
    url: "https://email.us-east-1.amazonaws.com/v2/email/identities/ada%40example.com?PageSize=1",
    method: "GET",
    headers: {},
  };
  const signed = await sign(req);
  const d = signed.headers["x-amz-date"] as string; // 20261006T120000Z
  const now = new Date(
    `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${d.slice(9, 11)}:${d.slice(11, 13)}:${
      d.slice(13, 15)
    }Z`,
  );
  const expected = await computeSigV4(req, CRED, "ses", now);
  assertEquals(
    signed.headers.authorization.endsWith(`Signature=${expected.signature}`),
    true,
  );
});

Deno.test("auth.sign: a session token is stamped as x-amz-security-token and signed", async () => {
  const req = {
    url: "https://email.us-east-1.amazonaws.com/v2/email/account",
    method: "GET",
    headers: {},
  };
  const withToken = await sign(req, { ...CRED, sessionToken: "TOKEN123" });
  assertEquals(withToken.headers["x-amz-security-token"], "TOKEN123");
  assertMatch(
    withToken.headers.authorization,
    /SignedHeaders=host;x-amz-date;x-amz-security-token,/,
  );
  const without = await sign(req);
  assertEquals("x-amz-security-token" in without.headers, false);
  assertNotEquals(withToken.headers.authorization, without.headers.authorization);
});

Deno.test("auth.sign: the secret never appears in the signed request", async () => {
  const signed = await sign({
    url: "https://email.us-east-1.amazonaws.com/v2/email/account",
    method: "GET",
    headers: {},
  });
  assertEquals(JSON.stringify(signed).includes(CRED.secretAccessKey), false);
});

Deno.test("auth.test: GetAccount 200 is ok", async () => {
  const { ctx, calls } = mockCtx([{ body: { SendingEnabled: true } }]);
  assertEquals(await auth.test({ credential: CRED }, ctx), { ok: true });
  assertEquals(calls[0].url, "https://email.us-east-1.amazonaws.com/v2/email/account");
  assertEquals(calls[0].method, "GET");
});

Deno.test("auth.test: AccessDeniedException is a LIVE credential without ses:GetAccount", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { message: "User is not authorized to perform: ses:GetAccount" },
    headers: { "x-amzn-errortype": "AccessDeniedException" },
  }]);
  const r = await auth.test({ credential: CRED }, ctx);
  assertEquals(r.ok, true);
  assertMatch(r.message!, /ses:GetAccount/);
});

Deno.test("auth.test: UnrecognizedClientException and signature errors are NOT ok, with the vendor's text", async () => {
  for (
    const type of [
      "UnrecognizedClientException",
      "InvalidSignatureException",
      "ExpiredTokenException",
    ]
  ) {
    const { ctx } = mockCtx([{
      status: 403,
      body: { message: "The security token included in the request is invalid." },
      headers: { "x-amzn-errortype": type },
    }]);
    const r = await auth.test({ credential: CRED }, ctx);
    assertEquals(r.ok, false);
    assertEquals(r.message, `${type}: The security token included in the request is invalid.`);
  }
});

Deno.test("auth.test: an error without a body message falls back to the status", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "", headers: {} }]);
  assertEquals(await auth.test({ credential: CRED }, ctx), {
    ok: false,
    message: "GetAccount returned 500",
  });
});

Deno.test("auth.afterConnect: echoes only the region", async () => {
  assertEquals(await auth.afterConnect!({ credential: CRED } as never, mockCtx().ctx), {
    region: "us-east-1",
  });
});
