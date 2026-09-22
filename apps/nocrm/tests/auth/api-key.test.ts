import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: collects the subdomain alongside the credential", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey, { in: "header", name: "X-API-KEY" });
  // The subdomain identifies the ACCOUNT, so it belongs to the Connection
  // rather than being re-entered on every action.
  assertEquals(auth.fields?.map((f) => f.key), ["subdomain", "apiKey"]);
  assertEquals(auth.fields?.find((f) => f.key === "apiKey")?.type, "secret");
  assertEquals(auth.fields?.find((f) => f.key === "subdomain")?.required, true);
});

Deno.test("api-key: sign stamps X-API-KEY and nothing else", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://acme.nocrm.io/api/v2/leads",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "91Jy7Xxr" } }, ctx);
  assertEquals(out.headers["X-API-KEY"], "91Jy7Xxr");
  assertEquals("authorization" in out.headers, false);
});

Deno.test("api-key: test refuses a half-filled credential without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(
    await auth.test({ credential: { subdomain: "acme" } }, ctx),
    { ok: false, message: "credential missing subdomain or apiKey" },
  );
  assertEquals(
    await auth.test({ credential: { apiKey: "91Jy7Xxr" } }, ctx),
    { ok: false, message: "credential missing subdomain or apiKey" },
  );
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test probes the account's own host, signed itself", async () => {
  const ok = mockCtx([{ body: { status: 200, message: "Your API key is correct." } }]);
  assertEquals(
    await auth.test({ credential: { subdomain: "acme", apiKey: "91Jy7Xxr" } }, ok.ctx),
    { ok: true },
  );
  assertEquals(ok.calls[0].url, "https://acme.nocrm.io/api/v2/ping");
  assertEquals(ok.calls[0].headers["x-api-key"], "91Jy7Xxr");
});

Deno.test("api-key: test classifies failure from the body's unauthorized_* type, not the status", async () => {
  const bad = mockCtx([{
    status: 401,
    body: {
      error: 401,
      message: "Unauthorized: invalid api_key",
      type: "unauthorized_invalid_token",
    },
  }]);
  assertEquals(
    await auth.test({ credential: { subdomain: "acme", apiKey: "wrong" } }, bad.ctx),
    { ok: false, message: "Unauthorized: invalid api_key" },
  );
});

Deno.test("api-key: test declines to read an unfamiliar body as success", async () => {
  // A 200 whose body is not the documented success shape, and a non-JSON body,
  // both stay failures rather than being taken on the status code alone.
  const odd = mockCtx([{ status: 200, body: { something: "else" } }]);
  assertEquals(
    await auth.test({ credential: { subdomain: "acme", apiKey: "k" } }, odd.ctx),
    { ok: false, message: "noCRM returned an unrecognised ping response" },
  );

  const notJson = mockCtx([{ status: 200, body: "<html>nope</html>" }]);
  assertEquals(
    await auth.test({ credential: { subdomain: "acme", apiKey: "k" } }, notJson.ctx),
    { ok: false, message: "noCRM returned an unrecognised ping response" },
  );
});

Deno.test("api-key: afterConnect records the subdomain for the client to use", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(
    await auth.afterConnect!({ credential: { subdomain: "acme", apiKey: "k" } }, ctx),
    { subdomain: "acme" },
  );
  // Nothing to fetch: the ping answers no account metadata.
  assertEquals(calls.length, 0);
});

Deno.test("api-key: afterConnect records nothing without a subdomain", async () => {
  const { ctx } = mockCtx();
  assertEquals(await auth.afterConnect!({ credential: { apiKey: "k" } }, ctx), {});
});
