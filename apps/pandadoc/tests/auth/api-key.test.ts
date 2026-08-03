import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: declares PandaDoc's `API-Key ` header prefix, not Bearer", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey?.in, "header");
  assertEquals(auth.apiKey?.name, "Authorization");
  assertEquals(auth.apiKey?.prefix, "API-Key ");
});

Deno.test("api-key: the credential field is a secret", () => {
  const field = auth.fields?.find((f) => f.key === "apiKey");
  assert(field);
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("api-key: sign stamps `Authorization: API-Key <key>`", () => {
  const request = {
    method: "GET",
    url: "https://api.pandadoc.com/public/v1/documents",
    headers: {},
  };
  const signed = auth.sign!(
    { request, credential: { apiKey: "k123" } } as never,
    undefined as never,
  ) as typeof request;
  assertEquals(signed.headers, { authorization: "API-Key k123" });
});

Deno.test("api-key: test probes GET /public/v1/members/current and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ body: { email: "a@b.com" } }]);
  const result = await auth.test({ credential: { apiKey: "k123" } } as never, ctx);

  assertEquals(calls[0].url, "https://api.pandadoc.com/public/v1/members/current");
  assertEquals(calls[0].headers["authorization"], "API-Key k123");
  assertEquals(result, { ok: true });
});

Deno.test("api-key: test surfaces PandaDoc's `detail` on a rejected key", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: { type: "authentication_error", detail: "Invalid key." } },
  ]);
  const result = await auth.test({ credential: { apiKey: "nope" } } as never, ctx);
  assertEquals(result, { ok: false, message: "Invalid key." });
});

Deno.test("api-key: test falls back to the status code when there is no detail", async () => {
  const { ctx } = mockCtx([{ status: 503, body: {} }]);
  const result = await auth.test({ credential: { apiKey: "k" } } as never, ctx);
  assertEquals(result, { ok: false, message: "PandaDoc returned HTTP 503" });
});

Deno.test("api-key: test rejects a credential with no key without calling out", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await auth.test({ credential: {} } as never, ctx);
  assertEquals(result, { ok: false, message: "credential missing apiKey" });
  assertEquals(calls.length, 0);
});

Deno.test("api-key: afterConnect records display metadata, never the credential", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        user_id: "u1",
        membership_id: "m1",
        email: "a@b.com",
        workspace: "w1",
        workspace_name: "Acme",
        role: "admin",
        user_license: "Full",
      },
    },
  ]);
  const display = await auth.afterConnect!(
    { credential: { apiKey: "k123" } } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls[0].url, "https://api.pandadoc.com/public/v1/members/current");
  // afterConnect must NOT hand-inject the credential — the runtime signs it.
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(display, {
    email: "a@b.com",
    membershipId: "m1",
    userId: "u1",
    workspace: "w1",
    workspaceName: "Acme",
    role: "admin",
    userLicense: "Full",
  });
  assertEquals("apiKey" in display, false);
});

Deno.test("api-key: afterConnect degrades to empty display rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  assertEquals(await auth.afterConnect!({ credential: {} } as never, ctx), {});
});
