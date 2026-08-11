import { assert, assertEquals } from "@std/assert";
import type { HookContext } from "@w6w/types";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { API_ROOT, mockCtx, unauthorizedBody } from "../_helpers.ts";

const CREDENTIAL = { apiKey: "hcp_live_0046421dc0ba47ec87bef0c089415380" };

Deno.test("api-key: the header prefix is Token, not Bearer", () => {
  assertEquals(authHeaders(CREDENTIAL), {
    authorization: `Token ${CREDENTIAL.apiKey}`,
  });
  assert(!authHeaders(CREDENTIAL).authorization.startsWith("Bearer"));
});

Deno.test("api-key: the declared apiKey config matches what sign actually sends", () => {
  assertEquals(apiKey.apiKey, { in: "header", name: "Authorization", prefix: "Token " });
  const request = { headers: {} as Record<string, string> };
  const signed = apiKey.sign!(
    { request, credential: CREDENTIAL } as never,
    {} as HookContext,
  ) as typeof request;
  assertEquals(signed.headers.authorization, `Token ${CREDENTIAL.apiKey}`);
});

Deno.test("api-key: sign is the only hook given the credential, and makes no request", () => {
  const { ctx, calls } = mockCtx([]);
  const request = { headers: {} as Record<string, string> };
  apiKey.sign!({ request, credential: CREDENTIAL } as never, ctx);
  assertEquals(calls.length, 0);
});

/**
 * `/company` is one of the 31 operations whose `security` lists all three
 * credential kinds. The fourteen partner-only operations would report a Pro's
 * own key as broken.
 */
Deno.test("api-key: the probe is GET /company", async () => {
  assertEquals(PROBE_PATH, "/company");
  const { ctx, calls } = mockCtx([{ body: { id: "co1", name: "Acme" } }]);
  const out = await apiKey.test({ credential: CREDENTIAL } as never, ctx);

  assertEquals(calls[0].url, `${API_ROOT}/company`);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers.authorization, `Token ${CREDENTIAL.apiKey}`);
  assertEquals(out, { ok: true });
});

Deno.test("api-key: a missing key fails without touching the network", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await apiKey.test({ credential: {} } as never, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: a 401 reports both causes and names the Token prefix", async () => {
  const { ctx } = mockCtx([{ status: 401, body: unauthorizedBody() }]);
  const out = await apiKey.test({ credential: CREDENTIAL } as never, ctx);

  assertEquals(out.ok, false);
  assert(out.message!.includes("401"));
  assert(out.message!.includes("either a key it does not recognise or a key that never reached"));
  assert(out.message!.includes("`Token `"));
});

Deno.test("api-key: a 403 is reported as an entitlement problem, not a bad key", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { message: "Forbidden" } }]);
  const out = await apiKey.test({ credential: CREDENTIAL } as never, ctx);
  assertEquals(out.ok, false);
  assert(out.message!.includes("live but not entitled"));
});

Deno.test("api-key: no failure message ever echoes the credential", async () => {
  for (
    const response of [
      { status: 401, body: unauthorizedBody() },
      { status: 403, body: { message: "Forbidden" } },
      { status: 500, body: { message: "boom" } },
    ]
  ) {
    const { ctx } = mockCtx([response]);
    const out = await apiKey.test({ credential: CREDENTIAL } as never, ctx);
    assert(!out.message!.includes(CREDENTIAL.apiKey), `leaked in ${response.status}`);
  }
});

Deno.test("api-key: afterConnect publishes the company name and nothing else", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      id: "co1",
      name: "Acme Plumbing",
      support_email: "ops@acme.example",
      phone_number: "+15125550100",
      address: { street: "1 Main St" },
      locations: [{ id: "loc-1" }],
    },
  }]);
  const out = await apiKey.afterConnect!({ credential: CREDENTIAL } as never, ctx);

  assertEquals(calls[0].url, `${API_ROOT}/company`);
  assertEquals(out, { companyName: "Acme Plumbing", companyId: "co1" });
});

Deno.test("api-key: afterConnect failing never fails a good connection", async () => {
  const { ctx } = mockCtx([{ status: 500, body: { message: "boom" } }]);
  assertEquals(await apiKey.afterConnect!({ credential: CREDENTIAL } as never, ctx), {});
});

Deno.test("api-key: the credential field is declared secret", () => {
  assertEquals(apiKey.fields?.length, 1);
  assertEquals(apiKey.fields?.[0].type, "secret");
  assertEquals(apiKey.fields?.[0].required, true);
});
