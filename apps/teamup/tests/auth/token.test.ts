import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth, {
  AUTHENTICATION_FAILED,
  authHeaders,
  PROBE_PATH,
  PROVIDERS_PATH,
} from "../../auth/token.ts";

const cred = { token: "M2M-TOKEN-123" };

const sign = (url: string, headers: Record<string, string> = {}) =>
  auth.sign!({
    request: { url, method: "GET", headers },
    credential: cred,
  } as never, mockCtx([]).ctx) as { url: string; headers: Record<string, string> };

const envelope = { count: 2, next: null, previous: null, results: [{ id: 1 }, { id: 2 }] };

/** The header shape the hand-written Authentication guide states verbatim. */
Deno.test("token: signs with `Bearer`, the prefix the Authentication guide uses", () => {
  const signed = sign("https://goteamup.com/api/v2/customers");
  assertEquals(signed.headers["authorization"], "Bearer M2M-TOKEN-123");
  assertEquals(authHeaders(cred), { authorization: "Bearer M2M-TOKEN-123" });
  assertEquals(auth.type, "bearer");
});

/** An M2M token is always Provider mode, so the mode header is never sent. */
Deno.test("token: never sends TeamUp-Request-Mode", () => {
  const signed = sign("https://goteamup.com/api/v2/customers");
  assertEquals(signed.headers["TeamUp-Request-Mode"], undefined);
  assertEquals(signed.headers["TeamUp-Provider-ID"], undefined);
});

Deno.test("token: the probe is the profile list, signed the same way", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(calls[0].url, `https://goteamup.com/api/v2${PROBE_PATH}`);
  assertEquals(calls[0].headers["authorization"], "Bearer M2M-TOKEN-123");
  assertEquals(result.ok, true);
  assert(/token is live/.test(result.message!), result.message);
  assert(/2 profiles visible/.test(result.message!), result.message);
});

/** An empty page is still a live credential. */
Deno.test("token: an empty results array is live, not a failure", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { count: 0, next: null, previous: null, results: [] },
  }]);
  assertEquals((await auth.test!({ credential: cred } as never, ctx)).ok, true);
});

/** The documented code for an invalid or expired credential, read from the body. */
Deno.test("token: a 401 is classified from the body's code, not the status alone", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: {
      code: AUTHENTICATION_FAILED,
      field_errors: {},
      message: "Invalid token.",
      type: "invalid_request_error",
    },
  }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/authentication_failed/.test(result.message!), result.message);
  assert(/Invalid token\./.test(result.message!), result.message);
  assert(/deleted, or belongs to a different business/.test(result.message!), result.message);
});

/** A 403 carries its own code and is surfaced as itself. */
Deno.test("token: a 403 reports the vendor's code rather than guessing", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { code: "mode_not_allowed", message: "Not allowed in this mode." },
  }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/mode_not_allowed/.test(result.message!), result.message);
});

/** A 200 that is not the envelope is not a live credential either. */
Deno.test("token: a 200 whose body is not the pagination envelope is a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { ok: true } }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/did not return TeamUp's pagination envelope/.test(result.message!), result.message);
});

Deno.test("token: a missing token is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await auth.test!({ credential: {} } as never, ctx);
  assertEquals(result.ok, false);
  assert(/missing token/.test(result.message!), result.message);
  assertEquals(calls.length, 0);
});

Deno.test("token: an unreachable host fails cleanly", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof auth.test>>[1];
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/could not reach https:\/\/goteamup.com/.test(result.message!), result.message);
});

/** A probe's result reaches the health surface; it must not carry the token. */
Deno.test("token: the probe never echoes the credential", async () => {
  const { ctx } = mockCtx([{ status: 200, body: envelope }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assert(!JSON.stringify(result).includes("M2M-TOKEN-123"), JSON.stringify(result));
  assertEquals(Object.keys(envelope).some((k) => /token|key|secret/i.test(k)), false);
});

Deno.test("token: afterConnect names the business and nothing else", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { count: 1, next: null, previous: null, results: [{ id: 1, name: "Downtown Studio" }] },
  }]);
  const display = await auth.afterConnect!({ credential: cred }, ctx);
  assertEquals(calls[0].url, `https://goteamup.com/api/v2${PROVIDERS_PATH}?page_size=1`);
  assertEquals(display, { providerName: "Downtown Studio" });
});

Deno.test("token: a failed or nameless afterConnect is silent, not fatal", async () => {
  const failing = mockCtx([{ status: 500, body: { code: "boom" } }]);
  assertEquals(await auth.afterConnect!({ credential: cred }, failing.ctx), {});
  const unnamed = mockCtx([{ status: 200, body: { count: 0, results: [] } }]);
  assertEquals(await auth.afterConnect!({ credential: cred }, unnamed.ctx), {});
});

Deno.test("token: the field is a secret pointing at the dashboard and the guide", () => {
  const field = auth.fields!.find((f) => f.key === "token")!;
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
  assert(/Settings/.test(field.hint!), field.hint);
  assert(
    /https:\/\/docs\.goteamup\.com\/guides\/creating-an-m2m-token/.test(field.hint!),
    field.hint,
  );
});

/** The label is only useful if the template names a variable afterConnect sets. */
Deno.test("token: the connection label renders the name afterConnect publishes", () => {
  assertEquals(auth.connectionLabel, "TeamUp ({{providerName}})");
});
