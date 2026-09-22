import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/user-token.ts";

Deno.test("user-token: is a separate method collecting the subdomain and the token", () => {
  assertEquals(auth.key, "user-token");
  assertEquals(auth.apiKey, { in: "header", name: "X-USER-TOKEN" });
  assertEquals(auth.fields?.map((f) => f.key), ["subdomain", "userToken"]);
  assertEquals(auth.fields?.find((f) => f.key === "userToken")?.type, "secret");
  // A different header from `api-key`'s — the document's own two-scheme framing.
  assertEquals(typeof auth.sign, "function");
});

Deno.test("user-token: sign stamps X-USER-TOKEN and nothing else", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://acme.nocrm.io/api/v2/leads",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { userToken: "ITd-Jb3E" } }, ctx);
  assertEquals(out.headers["X-USER-TOKEN"], "ITd-Jb3E");
  assertEquals("X-API-KEY" in out.headers, false);
  assertEquals("authorization" in out.headers, false);
});

Deno.test("user-token: test refuses a half-filled credential without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(
    await auth.test({ credential: { subdomain: "acme" } }, ctx),
    { ok: false, message: "credential missing subdomain or userToken" },
  );
  assertEquals(
    await auth.test({ credential: { userToken: "ITd-Jb3E" } }, ctx),
    { ok: false, message: "credential missing subdomain or userToken" },
  );
  assertEquals(calls.length, 0);
});

Deno.test("user-token: test probes the same ping endpoint with its own header", async () => {
  const ok = mockCtx([{ body: { status: 200, message: "Your API key is correct." } }]);
  assertEquals(
    await auth.test({ credential: { subdomain: "acme", userToken: "ITd-Jb3E" } }, ok.ctx),
    { ok: true },
  );
  assertEquals(ok.calls[0].url, "https://acme.nocrm.io/api/v2/ping");
  assertEquals(ok.calls[0].headers["x-user-token"], "ITd-Jb3E");
  assertEquals("x-api-key" in ok.calls[0].headers, false);
});

Deno.test("user-token: test reads the disabled-token refusal from the body", async () => {
  const bad = mockCtx([{
    status: 401,
    body: {
      error: 401,
      message: "Unauthorized: disabled token",
      type: "unauthorized_disabled_token",
    },
  }]);
  assertEquals(
    await auth.test({ credential: { subdomain: "acme", userToken: "old" } }, bad.ctx),
    { ok: false, message: "Unauthorized: disabled token" },
  );
});

Deno.test("user-token: a missing-token body without prose still reports the vendor's type", async () => {
  const bad = mockCtx([{ status: 401, body: { error: 401, type: "unauthorized_missing_token" } }]);
  assertEquals(
    await auth.test({ credential: { subdomain: "acme", userToken: "k" } }, bad.ctx),
    { ok: false, message: "noCRM refused the credential (unauthorized_missing_token)" },
  );
});

Deno.test("user-token: afterConnect records the subdomain", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(
    await auth.afterConnect!({ credential: { subdomain: "acme", userToken: "k" } }, ctx),
    { subdomain: "acme" },
  );
  assertEquals(calls.length, 0);
});
