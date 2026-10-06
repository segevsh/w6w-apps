import { assert, assertEquals } from "@std/assert";
import auth from "../../auth/personal-access-token.ts";
import { mockCtx, pathOf, unauthorized } from "../_helpers.ts";
import type { HookContext } from "@w6w/types";

const credential = { accountId: "acc-1", token: "tok-1" };
const expected = `Basic ${btoa("acc-1:tok-1")}`;

// deno-lint-ignore no-explicit-any
const testHook = auth.test as any;
// deno-lint-ignore no-explicit-any
const signHook = auth.sign as any;

Deno.test("auth: sign stamps Basic base64(accountId:token)", () => {
  const out = signHook({
    request: { url: "https://api.livechatinc.com/v3.6/agent/action/list_chats", headers: {} },
    credential,
  });
  assertEquals(out.headers["authorization"], expected);
});

Deno.test("auth: declares a secret token field and a plain account id", () => {
  assertEquals(auth.type, "basic");
  const byKey = Object.fromEntries((auth.fields ?? []).map((f) => [f.key, f]));
  assertEquals(byKey.token.type, "secret");
  assertEquals(byKey.accountId.type, "string");
});

Deno.test("auth.test: an array from list_channels passes, and the probe is signed by hand", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ channel_type: "code" }] }]);
  const out = await testHook({ credential }, ctx);
  assertEquals(out, { ok: true });
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v3.6/configuration/action/list_channels");
  assertEquals(calls[0].headers["authorization"], expected);
});

Deno.test("auth.test: the authentication error type is a rejected credential", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: { type: "authentication", message: "Invalid access token" } },
  }]);
  const out = await testHook({ credential }, ctx);
  assertEquals(out.ok, false);
  assert(out.message.includes("rejected the credential"));
  assert(out.message.includes("Invalid access token"));
});

Deno.test("auth.test: the verdict comes from the body, not the status", async () => {
  // A 200 carrying an error envelope is a failure...
  const a = mockCtx([{ status: 200, body: unauthorized }]);
  assertEquals((await testHook({ credential }, a.ctx)).ok, false);
  // ...and a 200 that is not the documented array is not a pass either.
  const b = mockCtx([{ status: 200, body: { html: "<spa/>" } }]);
  const out = await testHook({ credential }, b.ctx);
  assertEquals(out.ok, false);
  assert(out.message.includes("unexpected response"));
});

Deno.test("auth.test: other vendor errors and non-JSON bodies are reported", async () => {
  const wrongRegion = mockCtx([{
    status: 400,
    body: {
      error: { type: "misdirected_request", message: "Wrong region", data: { region: "fra" } },
    },
  }]);
  const r = await testHook({ credential }, wrongRegion.ctx);
  assert(r.message.includes("correct region: fra"));
  assert(!r.message.includes("rejected the credential"));

  const html = mockCtx([{ status: 502, body: "<html>" }]);
  assert((await testHook({ credential }, html.ctx)).message.includes("non-JSON"));
});

Deno.test("auth.test: a credential missing a part never reaches the network", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await testHook({ credential: { accountId: "a" } }, ctx as HookContext);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});
