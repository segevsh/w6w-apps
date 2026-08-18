import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

/** The key is the username and the password is empty — hence the colon. */
Deno.test("api-key: signs as HTTP Basic with a trailing colon", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.hellosign.com/v3/account",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "k1" } }, ctx);
  assertEquals(out.headers["authorization"], `Basic ${btoa("k1:")}`);
  assert(out.headers["authorization"] !== `Basic ${btoa("k1")}`, "the empty password is required");
});

Deno.test("api-key: the key is a secret field with no default", () => {
  const secretFields = auth.fields!.filter((f) => f.type === "secret").map((f) => f.key);
  assertEquals(secretFields, ["apiKey"]);
  assertEquals(auth.fields!.find((f) => f.key === "apiKey")!.default, undefined);
});

Deno.test("api-key: test probes the account endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { account: { account_id: "a1" } } }]);
  assertEquals(await auth.test!({ credential: { apiKey: "k1" } } as never, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.hellosign.com/v3/account");
  assertEquals(calls[0].headers["authorization"], `Basic ${btoa("k1:")}`);
});

/**
 * The live host distinguishes "no credentials" from "bad key" and so does this,
 * because they have different fixes.
 */
Deno.test("api-key: the two 401 shapes get different messages", async () => {
  const missing = mockCtx([{
    status: 401,
    body: { error: { error_msg: "Unauthorized user. No credentials supplied." } },
  }]);
  const a = await auth.test!({ credential: { apiKey: "k" } } as never, missing.ctx) as {
    ok: boolean;
    message: string;
  };
  assertEquals(a.ok, false);
  assert(a.message.includes("saw no credentials"), a.message);

  const bad = mockCtx([{ status: 401, body: { error: { error_msg: "Unauthorized api key" } } }]);
  const b = await auth.test!({ credential: { apiKey: "k" } } as never, bad.ctx) as {
    ok: boolean;
    message: string;
  };
  assertEquals(b.ok, false);
  assert(b.message.includes("rejected the API key"), b.message);
});

Deno.test("api-key: another failure reports its status", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals(await auth.test!({ credential: { apiKey: "k" } } as never, ctx), {
    ok: false,
    message: "Dropbox Sign returned 503",
  });
});

Deno.test("api-key: a missing key fails before any network call", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await auth.test!({ credential: {} } as never, ctx), {
    ok: false,
    message: "credential missing apiKey",
  });
  assertEquals(calls.length, 0);
});

Deno.test("api-key: afterConnect publishes who the key is, never the key", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      account: { email_address: "ada@example.com", account_id: "a1", is_paid_hs: true },
    },
  }]);
  const display = await auth.afterConnect!(
    { credential: { apiKey: "supersecret" } } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display, { accountEmail: "ada@example.com", accountId: "a1", paidSignPlan: true });
  assert(!JSON.stringify(display).includes("supersecret"), "the credential leaked into display");
});

Deno.test("api-key: a failed lookup still connects", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  assertEquals(await auth.afterConnect!({ credential: { apiKey: "k" } } as never, ctx), {});
});
