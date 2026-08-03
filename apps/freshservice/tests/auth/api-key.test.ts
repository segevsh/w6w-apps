import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth, { basicHeader } from "../../auth/api-key.ts";

Deno.test("api-key: collects the domain alongside the credential", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "basic");
  const keys = auth.fields?.map((f) => f.key);
  // The domain identifies the ACCOUNT, so it belongs to the Connection rather
  // than being re-entered on every action.
  assertEquals(keys, ["domain", "apiKey"]);
  assertEquals(auth.fields?.find((f) => f.key === "apiKey")?.type, "secret");
  assertEquals(auth.fields?.find((f) => f.key === "domain")?.type, "string");
});

Deno.test("api-key: the domain field rejects a full URL", () => {
  const pattern = auth.fields?.find((f) => f.key === "domain")?.validation?.pattern;
  assertEquals(typeof pattern, "string");
  const re = new RegExp(pattern!);
  assertEquals(re.test("acme"), true);
  assertEquals(re.test("acme.freshservice.com"), false);
  assertEquals(re.test("https://acme.freshservice.com"), false);
});

Deno.test("api-key: sign uses Freshservice's `apiKey:X` Basic scheme", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://acme.freshservice.com/api/v2/tickets",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "tok" } }, ctx);
  // The API key is the USERNAME; "X" is a throwaway password, not a secret.
  assertEquals(out.headers["authorization"], `Basic ${btoa("tok:X")}`);
  assertEquals(basicHeader("tok"), `Basic ${btoa("tok:X")}`);
  assertEquals(atob(basicHeader("tok").slice("Basic ".length)), "tok:X");
});

Deno.test("api-key: test refuses a half-filled credential without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: { domain: "acme" } }, ctx), {
    ok: false,
    message: "credential missing domain or apiKey",
  });
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test probes the account's own host, signed itself", async () => {
  const ok = mockCtx([{ body: { tickets: [] } }]);
  assertEquals(
    await auth.test({ credential: { domain: "acme", apiKey: "tok" } }, ok.ctx),
    { ok: true },
  );
  // Freshservice has no whoami, so the docs' own auth example is the probe.
  assertEquals(ok.calls[0].url, "https://acme.freshservice.com/api/v2/tickets?per_page=1");
  assertEquals(ok.calls[0].headers["authorization"], `Basic ${btoa("tok:X")}`);
});

Deno.test("api-key: test reports the status when the credential is rejected", async () => {
  const bad = mockCtx([{ status: 401, body: { code: "invalid_credentials" } }]);
  assertEquals(
    await auth.test({ credential: { domain: "acme", apiKey: "nope" } }, bad.ctx),
    { ok: false, message: "Freshservice returned 401" },
  );
});

Deno.test("api-key: afterConnect records the domain and makes no request", async () => {
  const { ctx, calls } = mockCtx();
  const out = await auth.afterConnect!({ credential: { domain: "acme", apiKey: "tok" } }, ctx);
  // Without this the client could never build a URL for the connection.
  assertEquals(out, { domain: "acme" });
  // Freshservice publishes no whoami to enrich the label with, so there is
  // nothing to fetch — and a hook that fetches nothing cannot leak anything.
  assertEquals(calls.length, 0);
});

Deno.test("api-key: afterConnect returns nothing when no domain was given", async () => {
  const { ctx } = mockCtx();
  assertEquals(await auth.afterConnect!({ credential: {} }, ctx), {});
});
