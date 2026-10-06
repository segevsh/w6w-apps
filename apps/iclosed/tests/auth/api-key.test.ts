import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, explain401, PROBE_PATH } from "../../auth/api-key.ts";
import { KEY_INVALID, KEY_REQUIRED, mockCtx } from "../_helpers.ts";

const GOOD = "iclosed_abc123";

Deno.test("auth: sign sets the bearer header and nothing else", () => {
  const req = {
    url: "https://public.api.iclosed.io/v1/users",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = apiKey.sign!(
    { request: req, credential: { apiKey: `  ${GOOD} ` } } as never,
    undefined as never,
  );
  assertEquals((out as typeof req).headers, { authorization: `Bearer ${GOOD}` });
});

Deno.test("auth: authHeaders tolerates a missing key", () => {
  assertEquals(authHeaders({}), { authorization: "Bearer " });
});

Deno.test("auth: the connection field is a secret", () => {
  assertEquals(apiKey.fields?.[0].type, "secret");
  assertEquals(apiKey.fields?.[0].required, true);
});

Deno.test("auth.test: 200 is ok and the probe carries the key", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  const out = await apiKey.test({ credential: { apiKey: GOOD } } as never, ctx);
  assertEquals(out, { ok: true });
  assertEquals(calls[0].url, `https://public.api.iclosed.io/v1${PROBE_PATH}`);
  assertEquals(calls[0].headers["authorization"], `Bearer ${GOOD}`);
});

Deno.test("auth.test: a key without the iclosed_ prefix fails locally, without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await apiKey.test({ credential: { apiKey: "iclosed-abc" } } as never, ctx);
  assertEquals(out.ok, false);
  assert(out.message?.includes("iclosed_"));
  assertEquals(calls.length, 0);
});

Deno.test("auth.test: an empty credential fails", async () => {
  const { ctx } = mockCtx([]);
  assertEquals((await apiKey.test({ credential: {} } as never, ctx)).ok, false);
});

Deno.test("auth.test: 401 is classified from the body message, not the status", async () => {
  for (
    const [body, needle] of [
      [KEY_INVALID, "does not recognise"],
      [KEY_REQUIRED, "treats the key as missing"],
      [{ message: "API key expired" }, "expired"],
    ] as const
  ) {
    const { ctx } = mockCtx([{ status: 401, body }]);
    const out = await apiKey.test({ credential: { apiKey: GOOD } } as never, ctx);
    assertEquals(out.ok, false);
    assert(out.message?.includes(needle), `${body.message}: ${out.message}`);
  }
});

Deno.test("auth.test: 403, 429 and 500 each get their own message", async () => {
  for (
    const [status, needle] of [[403, "403"], [429, "rate-limited"], [500, "HTTP 500"]] as const
  ) {
    const { ctx } = mockCtx([{ status, body: { message: "x" } }]);
    const out = await apiKey.test({ credential: { apiKey: GOOD } } as never, ctx);
    assertEquals(out.ok, false);
    assert(out.message?.includes(needle), `${status}: ${out.message}`);
  }
});

Deno.test("auth: explain401 falls back for an unknown message", () => {
  assert(explain401("weird").includes("weird"));
  assert(explain401(undefined).includes("401"));
});
