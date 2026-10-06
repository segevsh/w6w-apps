import { assert, assertEquals } from "@std/assert";
import authkey, { authHeaders, PROBE_PATH, PROBE_QUERY } from "../../auth/authkey.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const KEY = "unitTestFixtureNotARealKey0000";
const REJECTED = { message: "Invalid authkey", type: "error", code: "201" };

Deno.test("authkey: sign stamps the authkey header and leaves the URL alone", () => {
  const request = {
    method: "POST",
    url: "https://control.msg91.com/api/v5/flow",
    headers: {} as Record<string, string>,
  };
  const signed = authkey.sign!({ request, credential: { authkey: KEY } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authkey, KEY);
  assert(!signed.url.includes(KEY));
});

Deno.test("authkey: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ authkey: KEY }), { authkey: KEY });
});

Deno.test("authkey: the credential field is a secret", () => {
  const f = authkey.fields!.find((x) => x.key === "authkey")!;
  assertEquals(f.type, "secret");
  assertEquals(f.required, true);
});

Deno.test("authkey: test refuses an empty credential without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const r = await authkey.test({ credential: { authkey: "  " } }, ctx);
  assertEquals(r.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("authkey: test sends the key as a header and probes the OTP verify path", async () => {
  const { ctx, calls } = mockCtx([{ body: { type: "error", message: "No OTP request found" } }]);
  assertEquals(await authkey.test({ credential: { authkey: KEY } }, ctx), { ok: true });
  assertEquals(pathOf(calls[0].url), `/api/v5${PROBE_PATH}`);
  assertEquals(new URL(calls[0].url).search, `?${PROBE_QUERY}`);
  assertEquals(calls[0].headers.authkey, KEY);
  assert(!calls[0].url.includes(KEY));
});

Deno.test("authkey: HTTP 200 with Invalid authkey is a rejection, not a pass", async () => {
  const { ctx } = mockCtx([{ status: 200, body: REJECTED }]);
  const r = await authkey.test({ credential: { authkey: KEY } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("rejected"));
});

Deno.test("authkey: Auth Key missing and a 401 Unauthorized envelope are rejections", async () => {
  for (
    const [status, body] of [
      [200, { message: "Auth Key missing", type: "error" }],
      [401, {
        status: "fail",
        hasError: true,
        errors: "Unauthorized",
        code: "401",
        apiError: "201",
      }],
    ] as const
  ) {
    const { ctx } = mockCtx([{ status, body }]);
    assertEquals((await authkey.test({ credential: { authkey: KEY } }, ctx)).ok, false);
  }
});

Deno.test("authkey: a non-JSON or 5xx answer is not a pass", async () => {
  for (
    const r of [
      { body: "<html></html>", headers: { "content-type": "text/html" } },
      { status: 502, body: { type: "error", message: "bad gateway" } },
    ]
  ) {
    const { ctx } = mockCtx([r]);
    const out = await authkey.test({ credential: { authkey: KEY } }, ctx);
    assertEquals(out.ok, false);
    assert(out.message!.includes("unexpected body"));
  }
});
