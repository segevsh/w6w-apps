import { assert, assertEquals, assertRejects } from "@std/assert";
import auth from "../../auth/client-credentials.ts";
import { mockCtx } from "../_helpers.ts";

const cred = {
  deployment: "acme",
  clientId: "id1@acme.accelo.com",
  clientSecret: "s3cret",
  scope: "write(all)",
  accessToken: "tok",
  expiresAt: "2099-01-01T00:00:00.000Z",
};

// deno-lint-ignore no-explicit-any
const a = auth as any;

Deno.test("exchange: Basic-authenticated client_credentials POST to the deployment's token endpoint", async () => {
  const { ctx, calls } = mockCtx([{
    body: { access_token: "T", token_type: "bearer", expires_in: "2592000", deployment: "acme" },
  }]);
  const out = await a.exchange({
    fields: {
      deployment: "https://Acme.api.accelo.com",
      clientId: " id1@acme.accelo.com ",
      clientSecret: "s3cret",
    },
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://acme.api.accelo.com/oauth2/v0/token");
  assertEquals(calls[0].headers.authorization, `Basic ${btoa("id1@acme.accelo.com:s3cret")}`);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(
    Object.fromEntries(new URLSearchParams(calls[0].body ?? "")),
    { grant_type: "client_credentials", scope: "write(all)" },
  );
  // The client id/secret are NOT in the form body.
  assert(!calls[0].body?.includes("s3cret"));
  assertEquals(out.accessToken, "T");
  assertEquals(out.deployment, "acme");
  // expires_in is a STRING on the wire and is coerced; 30 days minus a minute of headroom.
  const ms = new Date(out.expiresAt).getTime() - Date.now();
  assert(ms > 2_591_000_000 && ms <= 2_592_000_000, String(ms));
});

Deno.test("exchange: a narrower scope is sent verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: { access_token: "T", expires_in: 3600 } }]);
  await a.exchange({
    fields: { deployment: "acme", clientId: "i", clientSecret: "s", scope: "read(all)" },
  }, ctx);
  assertEquals(new URLSearchParams(calls[0].body ?? "").get("scope"), "read(all)");
});

Deno.test("exchange: surfaces the RFC 6749 error body, not the envelope", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "invalid_client", error_description: "client id and secret were not found" },
  }]);
  await assertRejects(
    () => a.exchange({ fields: { deployment: "acme", clientId: "i", clientSecret: "s" } }, ctx),
    Error,
    "client id and secret were not found",
  );
});

Deno.test("exchange: requires both secrets and a clean deployment, with no request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve().then(() => a.exchange({ fields: { deployment: "acme" } }, ctx)),
    Error,
    "required",
  );
  await assertRejects(
    () =>
      Promise.resolve().then(() =>
        a.exchange({ fields: { deployment: "evil.com", clientId: "i", clientSecret: "s" } }, ctx)
      ),
    Error,
    "subdomain",
  );
  assertEquals(calls.length, 0);
});

Deno.test("refresh: mints again from the stored client id and secret", async () => {
  const { ctx, calls } = mockCtx([{ body: { access_token: "T2", expires_in: "100" } }]);
  const out = await a.refresh({ credential: cred }, ctx);
  assertEquals(out.accessToken, "T2");
  assertEquals(calls[0].url, "https://acme.api.accelo.com/oauth2/v0/token");
});

Deno.test("refresh: refuses a credential missing its client secret", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve().then(() => a.refresh({ credential: { deployment: "acme" } }, ctx)),
    Error,
    "reconnect",
  );
});

Deno.test("sign: stamps the bearer token", () => {
  const out = a.sign({ request: { headers: {} }, credential: cred });
  assertEquals(out.headers.authorization, "Bearer tok");
});

Deno.test("test: tokeninfo 200 passes", async () => {
  const { ctx, calls } = mockCtx([{
    body: { meta: { status: "ok" }, response: { email: "a@b" } },
  }]);
  assertEquals(await a.test({ credential: cred }, ctx), { ok: true });
  assertEquals(calls[0].url, "https://acme.api.accelo.com/api/v0/tokeninfo");
  assertEquals(calls[0].headers.authorization, "Bearer tok");
});

Deno.test("test: classifies from the body — 401 invalid_client is a rejected token", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { meta: { status: "invalid_client", message: "Could not authorize your access" } },
  }]);
  const out = await a.test({ credential: cred }, ctx);
  assertEquals(out.ok, false);
  assert(out.message.includes("rejected the token"));
});

Deno.test("test: 400 means the deployment is wrong", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { meta: { status: "invalid_request", message: "Deployment 'acme' was not found." } },
  }]);
  const out = await a.test({ credential: cred }, ctx);
  assertEquals(out.ok, false);
  assert(out.message.includes("check the subdomain"));
});

Deno.test("test: a 200 carrying a non-ok meta.status still fails", async () => {
  const { ctx } = mockCtx([{ body: { meta: { status: "server_error", message: "boom" } } }]);
  assertEquals((await a.test({ credential: cred }, ctx)).ok, false);
});

Deno.test("test: missing token or deployment fails without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await a.test({ credential: { deployment: "acme" } }, ctx)).ok, false);
  assertEquals(
    (await a.test({ credential: { accessToken: "t", deployment: "a.b" } }, ctx)).ok,
    false,
  );
  assertEquals(calls.length, 0);
});

Deno.test("afterConnect: records deployment and the token owner, never the token", async () => {
  const { ctx } = mockCtx([{
    body: {
      meta: { status: "ok" },
      response: { email: "k@w.test", firstname: "Kurt", surname: "Wagner", staff_id: "3" },
    },
  }]);
  const out = await a.afterConnect({ credential: cred }, ctx);
  assertEquals(out, {
    deployment: "acme",
    email: "k@w.test",
    staffId: "3",
    user: { name: "Kurt Wagner", email: "k@w.test" },
  });
  assert(!JSON.stringify(out).includes("tok"));
});

Deno.test("afterConnect: falls back to just the deployment on failure", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  assertEquals(await a.afterConnect({ credential: cred }, ctx), { deployment: "acme" });
});

Deno.test("revoke: POSTs the token with Basic app credentials; a failure only logs", async () => {
  const ok = mockCtx([{ body: {} }]);
  await a.revoke({ credential: cred }, ok.ctx);
  assertEquals(ok.calls[0].url, "https://acme.api.accelo.com/oauth2/v0/revoke");
  assertEquals(new URLSearchParams(ok.calls[0].body ?? "").get("token"), "tok");
  assertEquals(ok.calls[0].headers.authorization, `Basic ${btoa("id1@acme.accelo.com:s3cret")}`);

  const bad = mockCtx([{ status: 500, body: {} }]);
  await a.revoke({ credential: cred }, bad.ctx);
  assertEquals(bad.logs[0].level, "warn");
});
