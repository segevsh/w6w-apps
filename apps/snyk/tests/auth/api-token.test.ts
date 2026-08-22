import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-token.ts";
import { DEFAULT_VERSION } from "../../lib/client.ts";

/** Snyk's scheme description says the value "must be prefixed with `Token `". */
Deno.test("api-token: signs with Token, not Bearer", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.snyk.io/rest/self",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiToken: "abc" } }, ctx);
  assertEquals(out.headers["authorization"], "Token abc");
  assertEquals(auth.apiKey?.prefix, "Token ");
});

Deno.test("api-token: the token is the only secret; org and version are plain", () => {
  const secret = auth.fields!.filter((f) => f.type === "secret").map((f) => f.key);
  assertEquals(secret, ["apiToken"]);
  const version = auth.fields!.find((f) => f.key === "apiVersion")!;
  assertEquals(version.default, DEFAULT_VERSION);
  // A date, optionally with Snyk's ~beta / ~experimental suffix.
  assert(new RegExp(version.validation!.pattern!).test("2026-03-25"));
  assert(new RegExp(version.validation!.pattern!).test("2026-03-25~beta"));
  assert(!new RegExp(version.validation!.pattern!).test("latest"));
});

Deno.test("api-token: test probes /self with the version query param", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: {} } }]);
  assertEquals(await auth.test!({ credential: { apiToken: "t" } } as never, ctx), { ok: true });
  assertEquals(calls[0].url, `https://api.snyk.io/rest/self?version=${DEFAULT_VERSION}`);
  assertEquals(calls[0].headers["authorization"], "Token t");
});

Deno.test("api-token: a 400 is reported as a probably-bad version", async () => {
  const { ctx } = mockCtx([{ status: 400, body: {} }]);
  const r = await auth.test!(
    { credential: { apiToken: "t", apiVersion: "1999-01-01" } } as never,
    ctx,
  ) as { ok: boolean; message: string };
  assertEquals(r.ok, false);
  assert(r.message.includes("1999-01-01"), r.message);
});

Deno.test("api-token: 401 says the token was rejected", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: [{ status: "401" }] } }]);
  const r = await auth.test!({ credential: { apiToken: "t" } } as never, ctx) as {
    ok: boolean;
    message: string;
  };
  assertEquals(r.ok, false);
  assert(r.message.includes("401"), r.message);
});

Deno.test("api-token: a missing token fails before any network call", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await auth.test!({ credential: {} } as never, ctx), {
    ok: false,
    message: "credential missing apiToken",
  });
  assertEquals(calls.length, 0);
});

Deno.test("api-token: afterConnect records org, version and user — never the token", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { data: { id: "u1", attributes: { name: "Ann", username: "ann", email: "a@b.com" } } },
  }]);
  const d = await auth.afterConnect!(
    { credential: { apiToken: "sup3rsecret", orgId: "org-1" } } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(d.orgId, "org-1");
  assertEquals(d.apiVersion, DEFAULT_VERSION);
  assertEquals((d.user as Record<string, unknown>).username, "ann");
  assert(!JSON.stringify(d).includes("sup3rsecret"), "the credential leaked into display");
});

Deno.test("api-token: a failed lookup still records the scope actions need", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  assertEquals(
    await auth.afterConnect!({ credential: { apiToken: "t", orgId: "o" } } as never, ctx),
    { orgId: "o", apiVersion: DEFAULT_VERSION },
  );
});
