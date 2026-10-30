import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

test("api-key: collects the domain alongside the credential", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "custom");
  const keys = auth.fields?.map((f) => f.key);
  // The domain identifies the ACCOUNT, so it belongs to the Connection rather
  // than being re-entered on every action.
  assertEquals(keys, ["domain", "apiKey"]);
  assertEquals(auth.fields?.find((f) => f.key === "apiKey")?.type, "secret");
  assertEquals(auth.fields?.find((f) => f.key === "domain")?.type, "string");
});

test("api-key: sign uses Freshsales's `Token token=` scheme", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://acme.myfreshworks.com/crm/sales/api/contacts",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "tok" } }, ctx);
  assertEquals(out.headers["authorization"], "Token token=tok");
});

test("api-key: test refuses a half-filled credential without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: { domain: "acme" } }, ctx), {
    ok: false,
    message: "credential missing domain or apiKey",
  });
  assertEquals(calls.length, 0);
});

test("api-key: test passes on a well-formed filters response", async () => {
  const ok = mockCtx([{ body: { filters: [{ id: 1, name: "All Contacts" }] } }]);
  assertEquals(
    await auth.test({ credential: { domain: "acme", apiKey: "tok" } }, ok.ctx),
    { ok: true },
  );
  assertEquals(ok.calls[0].url, "https://acme.myfreshworks.com/crm/sales/api/contacts/filters");
  assertEquals(ok.calls[0].headers["authorization"], "Token token=tok");
});

test("api-key: test classifies a dead credential from the vendor's own error body", async () => {
  const bad = mockCtx([{
    status: 401,
    body: { errors: { code: "401", message: "Invalid Credentials or Authorization Header" } },
  }]);
  assertEquals(
    await auth.test({ credential: { domain: "acme", apiKey: "bad" } }, bad.ctx),
    { ok: false, message: "Invalid Credentials or Authorization Header" },
  );
});

test("api-key: test never echoes the credential back in its own message", async () => {
  const bad = mockCtx([{ status: 401, body: { errors: { message: "nope" } } }]);
  const out = await auth.test(
    { credential: { domain: "acme", apiKey: "super-secret-key" } },
    bad.ctx,
  );
  assertEquals(JSON.stringify(out).includes("super-secret-key"), false);
});

test("api-key: afterConnect records only the domain — no whoami exists to enrich it", () => {
  const out = auth.afterConnect!({ credential: { domain: "acme", apiKey: "tok" } }, {} as never);
  assertEquals(out, { domain: "acme" });
});

test("api-key: afterConnect returns nothing when the credential carries no domain", () => {
  const out = auth.afterConnect!({ credential: { apiKey: "tok" } }, {} as never);
  assertEquals(out, {});
});
