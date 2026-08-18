import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import production from "../../auth/client-secret.ts";
import sandbox from "../../auth/client-secret-sandbox.ts";

const credential = { clientId: "cid", secret: "sec", environment: "sandbox" };

/** Separate methods because the secret differs per environment. */
Deno.test("client-secret: sandbox and production are separate methods", () => {
  assertEquals(production.key, "client-secret");
  assertEquals(sandbox.key, "client-secret-sandbox");
  assertEquals(production.type, "custom");
});

/** Plaid takes no Authorization header — the credential goes in the BODY. */
Deno.test("client-secret: sign injects the pair into the JSON body", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://sandbox.plaid.com/accounts/get",
    method: "POST" as const,
    headers: {} as Record<string, string>,
    body: JSON.stringify({ access_token: "tok" }),
  };
  const out = await sandbox.sign!({ request, credential }, ctx);
  assertEquals(JSON.parse(out.body!), {
    client_id: "cid",
    secret: "sec",
    access_token: "tok",
  });
  assertEquals("authorization" in out.headers, false);
});

Deno.test("client-secret: an empty body still gets the credential", async () => {
  const { ctx } = mockCtx();
  const out = await sandbox.sign!({
    request: {
      url: "https://sandbox.plaid.com/institutions/get",
      method: "POST" as const,
      headers: {} as Record<string, string>,
    },
    credential,
  }, ctx);
  assertEquals(JSON.parse(out.body!), { client_id: "cid", secret: "sec" });
});

Deno.test("client-secret: a body that is not JSON is left alone", async () => {
  const { ctx } = mockCtx();
  const out = await sandbox.sign!({
    request: {
      url: "https://sandbox.plaid.com/x",
      method: "POST" as const,
      headers: {} as Record<string, string>,
      body: "not json",
    },
    credential,
  }, ctx);
  assertEquals(out.body, "not json");
});

Deno.test("client-secret: exchange records the environment with the pair", async () => {
  const { ctx } = mockCtx();
  const out = await sandbox.exchange!(
    { fields: { clientId: "cid", secret: "sec" } },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(out.environment, "sandbox");
  assertEquals(out.clientId, "cid");
});

Deno.test("client-secret: exchange refuses an incomplete pair", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await sandbox.exchange!({ fields: { clientId: "cid" } }, ctx),
    Error,
    "required",
  );
});

/** The commonest setup mistake: the other environment's secret. */
Deno.test("client-secret: test names the wrong-environment case specifically", async () => {
  const { ctx, calls } = mockCtx([{
    status: 400,
    body: { error_code: "INVALID_API_KEYS", error_message: "invalid client_id or secret" },
  }]);
  const out = await sandbox.test!({ credential }, ctx);
  assertEquals(out.ok, false);
  assert(/differs per environment/.test(out.message!), out.message);
  assertEquals(new URL(calls[0].url).host, "sandbox.plaid.com");
});

Deno.test("client-secret: a working key reports the environment", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { institutions: [], total: 1 } }]);
  const out = await sandbox.test!({ credential }, ctx);
  assertEquals(out.ok, true);
  assert(/sandbox/.test(out.message!), out.message);
});

Deno.test("client-secret: afterConnect records only the environment", () => {
  const display = sandbox.afterConnect!({ credential }, mockCtx().ctx) as Record<string, unknown>;
  assertEquals(display, { environment: "sandbox" });
  assert(!JSON.stringify(display).includes("sec"));
});

Deno.test("client-secret: both fields are declared secret", () => {
  for (const key of ["clientId", "secret"]) {
    assertEquals(sandbox.fields!.find((f) => f.key === key)!.type, "secret", key);
  }
});
