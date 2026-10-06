import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth, { basicHeader } from "../../auth/api-key.ts";

Deno.test("api-key: collects the domain alongside the credential", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "basic");
  assertEquals(auth.fields?.map((f) => f.key), ["domain", "apiKey"]);
  assertEquals(auth.fields?.find((f) => f.key === "apiKey")?.type, "secret");
});

Deno.test("api-key: the domain field rejects a full URL", () => {
  const re = new RegExp(auth.fields?.find((f) => f.key === "domain")?.validation?.pattern!);
  assertEquals(re.test("acme"), true);
  assertEquals(re.test("acme.talentlms.com"), false);
  assertEquals(re.test("https://acme.talentlms.com"), false);
});

Deno.test("api-key: sign sends the key as the Basic username with an empty password", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://acme.talentlms.com/api/v1/users",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "k3y" } }, ctx);
  assertEquals(out.headers["authorization"], `Basic ${btoa("k3y:")}`);
  assertEquals(atob(basicHeader("k3y").slice("Basic ".length)), "k3y:");
});

Deno.test("api-key: test refuses a half-filled credential without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: { domain: "acme" } }, ctx), {
    ok: false,
    message: "credential missing domain or apiKey",
  });
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test accepts the rate-limit document", async () => {
  const { ctx, calls } = mockCtx([{ body: { limit: "2000", remaining: "1999" } }]);
  assertEquals(await auth.test({ credential: { domain: "acme", apiKey: "k" } }, ctx), { ok: true });
  assertEquals(calls[0].url, "https://acme.talentlms.com/api/v1/ratelimit");
  assertEquals(calls[0].headers["authorization"], `Basic ${btoa("k:")}`);
});

Deno.test("api-key: test reports the vendor's message on a refusal", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: { type: "invalid_request_error", message: "Invalid API key provided" } },
  }]);
  const out = await auth.test({ credential: { domain: "acme", apiKey: "bad" } }, ctx);
  assertEquals(out, { ok: false, message: "TalentLMS returned 401: Invalid API key provided" });
});

Deno.test("api-key: a 200 that is not the rate-limit document is not a pass", async () => {
  const html = mockCtx([{ body: "<html>login</html>", headers: { "content-type": "text/html" } }]);
  const out = await auth.test({ credential: { domain: "acme", apiKey: "k" } }, html.ctx);
  assertEquals(out.ok, false);
  const json = mockCtx([{ body: { something: "else" } }]);
  assertEquals(
    (await auth.test({ credential: { domain: "acme", apiKey: "k" } }, json.ctx)).ok,
    false,
  );
});

Deno.test("api-key: afterConnect records the domain, and nothing secret", async () => {
  const { ctx } = mockCtx();
  const secret = { credential: { domain: "acme", apiKey: "k" } } as never;
  assertEquals(await auth.afterConnect!(secret, ctx), { domain: "acme" });
  assertEquals(await auth.afterConnect!({ credential: {} } as never, ctx), {});
});
