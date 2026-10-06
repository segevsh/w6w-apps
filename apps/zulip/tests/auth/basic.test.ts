import { assert, assertEquals } from "@std/assert";
import auth, { basicHeader, classifyProbe } from "../../auth/basic.ts";
import { mockCtx } from "../_helpers.ts";

const cred = { subdomain: "acme", email: "bot@acme.zulipchat.com", apiKey: "k3y" };

Deno.test("basic: sign stamps Basic base64(email:apiKey) and nothing else", () => {
  const request = { url: "https://acme.zulipchat.com/api/v1/users/me", method: "GET", headers: {} };
  const out = auth.sign!({ request, credential: cred }, mockCtx().ctx);
  assertEquals((out as typeof request).headers, {
    authorization: `Basic ${btoa("bot@acme.zulipchat.com:k3y")}`,
  });
});

Deno.test("basic: declares type basic with subdomain, email and a secret apiKey", () => {
  assertEquals(auth.type, "basic");
  const byKey = Object.fromEntries(auth.fields!.map((f) => [f.key, f]));
  assertEquals(Object.keys(byKey), ["subdomain", "email", "apiKey"]);
  assertEquals(byKey.apiKey.type, "secret");
  for (const f of auth.fields!) assertEquals(f.required, true);
  assert(basicHeader({}).startsWith("Basic "));
});

Deno.test("basic: test probes GET /users/me on the credential's own org with Basic auth", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success", msg: "", user_id: 5 } }]);
  const out = await auth.test(
    { credential: { ...cred, subdomain: "https://Acme.zulipchat.com/" } },
    ctx,
  );
  assertEquals(out, { ok: true });
  assertEquals(calls[0].url, "https://acme.zulipchat.com/api/v1/users/me");
  assertEquals(calls[0].headers["authorization"], basicHeader(cred));
});

Deno.test("basic: test rejects a credential missing a field or with a hostile subdomain, with no request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await auth.test({ credential: { ...cred, apiKey: " " } }, ctx)).ok, false);
  assertEquals((await auth.test({ credential: { ...cred, email: "" } }, ctx)).ok, false);
  assertEquals(
    (await auth.test({ credential: { ...cred, subdomain: "evil.com/x" } }, ctx)).ok,
    false,
  );
  assertEquals(calls.length, 0);
});

Deno.test("basic: test classifies a rejected key by body, and an unknown org separately", async () => {
  const bad = mockCtx([{
    status: 401,
    body: { result: "error", msg: "Invalid API key", code: "UNAUTHORIZED" },
  }]);
  const r1 = await auth.test({ credential: cred }, bad.ctx);
  assertEquals(r1.ok, false);
  assert(r1.message!.includes("rejected the email / API key"));

  const org = mockCtx([{
    status: 400,
    body: { result: "error", msg: "Invalid subdomain", code: "BAD_REQUEST" },
  }]);
  const r2 = await auth.test({ credential: cred }, org.ctx);
  assert(r2.message!.includes("No Zulip Cloud organization"));
});

Deno.test("basic: a transport failure is reported, not thrown", async () => {
  const { ctx } = mockCtx([]); // empty queue makes the mock fetch throw
  const out = await auth.test({ credential: cred }, ctx);
  assertEquals(out.ok, false);
  assert(out.message!.includes("could not reach acme.zulipchat.com"));
});

Deno.test("classifyProbe: ok needs a real profile; 429 and 5xx are not verdicts on the key", () => {
  assertEquals(classifyProbe(200, { result: "success", user_id: 1 }), { ok: true });
  assertEquals(classifyProbe(200, { result: "success" }).ok, false);
  assert(classifyProbe(429, { code: "RATE_LIMIT_HIT" }).message!.includes("rate-limited"));
  assert(classifyProbe(503, null).message!.includes("not a verdict"));
  assert(classifyProbe(403, null).message!.includes("rejected"));
  assert(classifyProbe(418, null).message!.includes("unexpected 418"));
});

Deno.test("basic: afterConnect republishes a normalized subdomain and the email, never the key", () => {
  const out = auth.afterConnect!(
    { credential: { ...cred, subdomain: "Acme.zulipchat.com" } },
    mockCtx().ctx,
  );
  assertEquals(out, { subdomain: "acme", email: "bot@acme.zulipchat.com" });
});
