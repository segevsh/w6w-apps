import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-token.ts";

Deno.test("api-token: collects the domain alongside the credential", () => {
  assertEquals(auth.key, "api-token");
  assertEquals(auth.type, "apiKey");
  const keys = auth.fields?.map((f) => f.key);
  // The domain identifies the ORG, so it belongs to the Connection rather
  // than being re-entered on every action.
  assertEquals(keys, ["domain", "apiToken"]);
  assertEquals(auth.fields?.find((f) => f.key === "apiToken")?.type, "secret");
  assertEquals(auth.fields?.find((f) => f.key === "domain")?.type, "string");
});

Deno.test("api-token: apiKey config uses Okta's SSWS scheme", () => {
  assertEquals(auth.apiKey, { in: "header", name: "Authorization", prefix: "SSWS " });
});

Deno.test("api-token: sign stamps `Authorization: SSWS <token>`", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://dev-1.okta.com/api/v1/users",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiToken: "tok" } }, ctx);
  assertEquals(out.headers["authorization"], "SSWS tok");
});

Deno.test("api-token: test refuses a half-filled credential without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: { domain: "dev-1.okta.com" } }, ctx), {
    ok: false,
    message: "credential missing domain or apiToken",
  });
  assertEquals(calls.length, 0);
});

Deno.test("api-token: test probes the org's own host with a 1-row user list", async () => {
  const ok = mockCtx([{ body: [{ id: "00u1" }] }]);
  assertEquals(
    await auth.test({ credential: { domain: "dev-1.okta.com", apiToken: "t" } }, ok.ctx),
    { ok: true },
  );
  assertEquals(ok.calls[0].url, "https://dev-1.okta.com/api/v1/users?limit=1");
  assertEquals(ok.calls[0].headers["authorization"], "SSWS t");
});

Deno.test("api-token: test reports a non-ok response", async () => {
  const bad = mockCtx([{ status: 401 }]);
  assertEquals(
    await auth.test({ credential: { domain: "dev-1.okta.com", apiToken: "bad" } }, bad.ctx),
    { ok: false, message: "Okta returned 401" },
  );
});

Deno.test("api-token: afterConnect records the domain for the client to use", async () => {
  const { ctx } = mockCtx([{ body: [{ profile: { login: "jane@acme.test" } }] }]);
  const out = await auth.afterConnect!(
    { credential: { domain: "dev-1.okta.com", apiToken: "t" } },
    ctx,
  );
  assertEquals(out, { domain: "dev-1.okta.com", user: { login: "jane@acme.test" } });
});

Deno.test("api-token: afterConnect still records the domain if the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const out = await auth.afterConnect!(
    { credential: { domain: "dev-1.okta.com", apiToken: "t" } },
    ctx,
  );
  // Without this the client could never build a URL for the connection.
  assertEquals(out, { domain: "dev-1.okta.com" });
  assert("domain" in out);
});
