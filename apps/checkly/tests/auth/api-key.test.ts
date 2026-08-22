import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

/** Checkly's own scheme description spells out both halves. */
Deno.test("api-key: signs with the bearer token AND the account header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.checklyhq.com/v1/checks",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "k1", accountId: "a1" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer k1");
  assertEquals(out.headers["x-checkly-account"], "a1");
});

/** The header is declared on 188/194 operations — the gaps are a spec bug. */
Deno.test("api-key: both fields are required", () => {
  const required = auth.fields!.filter((f) => f.required).map((f) => f.key).sort();
  assertEquals(required, ["accountId", "apiKey"]);
  assertEquals(auth.fields!.filter((f) => f.type === "secret").map((f) => f.key), ["apiKey"]);
});

/**
 * /v1/accounts/me proves both halves; /v1/checks would pass for a key pointed
 * at the wrong account.
 */
Deno.test("api-key: test probes the account, not just the key", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { name: "Acme" } }]);
  assertEquals(
    await auth.test!({ credential: { apiKey: "k1", accountId: "a1" } } as never, ctx),
    { ok: true },
  );
  assertEquals(calls[0].url, "https://api.checklyhq.com/v1/accounts/me");
  assertEquals(calls[0].headers["x-checkly-account"], "a1");
});

Deno.test("api-key: a bad key and a wrong account get different messages", async () => {
  const badKey = mockCtx([{ status: 401, body: {} }]);
  const a = await auth.test!(
    { credential: { apiKey: "k", accountId: "a1" } } as never,
    badKey.ctx,
  ) as { ok: boolean; message: string };
  assert(a.message.includes("rejected the API key"), a.message);

  for (const status of [403, 404]) {
    const wrongAccount = mockCtx([{ status, body: {} }]);
    const b = await auth.test!(
      { credential: { apiKey: "k", accountId: "nope" } } as never,
      wrongAccount.ctx,
    ) as { ok: boolean; message: string };
    assertEquals(b.ok, false);
    assert(b.message.includes("cannot reach account"), b.message);
    assert(b.message.includes("nope"), b.message);
  }
});

Deno.test("api-key: a missing field fails before any network call", async () => {
  const noKey = mockCtx([]);
  assertEquals(await auth.test!({ credential: { accountId: "a1" } } as never, noKey.ctx), {
    ok: false,
    message: "credential missing apiKey",
  });
  const noAccount = mockCtx([]);
  assertEquals(await auth.test!({ credential: { apiKey: "k" } } as never, noAccount.ctx), {
    ok: false,
    message: "credential missing accountId",
  });
  assertEquals(noKey.calls.length + noAccount.calls.length, 0);
});

Deno.test("api-key: afterConnect publishes the account and runtime, never the key", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { name: "Acme", runtimeId: "2025.04" } }]);
  const display = await auth.afterConnect!(
    { credential: { apiKey: "supersecret", accountId: "a1" } } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display, { accountId: "a1", accountName: "Acme", runtimeId: "2025.04" });
  assert(!JSON.stringify(display).includes("supersecret"), "the credential leaked into display");
});

Deno.test("api-key: a failed lookup still connects, with the account id recorded", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  assertEquals(
    await auth.afterConnect!({ credential: { apiKey: "k", accountId: "a1" } } as never, ctx),
    { accountId: "a1" },
  );
});
