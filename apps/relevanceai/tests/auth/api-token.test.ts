import { assert, assertEquals } from "@std/assert";
import apiToken, {
  authHeaders,
  MISSING_HEADER_ERROR_TYPE,
  PROBE_PATH,
  type RelevanceAiCredential,
} from "../../auth/api-token.ts";
import { API_ROOT, authInfo, errorBody, mockCtx } from "../_helpers.ts";

Deno.test("api-token: collects the region id beside the key", () => {
  assertEquals(apiToken.key, "api-token");
  assertEquals(apiToken.type, "apiKey");
  // One header, no prefix: the vendor's security scheme is `apiKey` in
  // `Authorization`, and the key already carries its `project_id:secret` shape.
  assertEquals(apiToken.apiKey, { in: "header", name: "authorization" });
  assertEquals(apiToken.fields?.map((f) => f.key), ["regionId", "apiKey"]);
  assertEquals(apiToken.fields?.find((f) => f.key === "apiKey")?.type, "secret");
  assertEquals(apiToken.fields?.find((f) => f.key === "regionId")?.type, "string");
  assertEquals(apiToken.fields?.find((f) => f.key === "regionId")?.required, true);
  assertEquals(apiToken.connectionLabel, "{{user.name}} ({{regionId}})");
});

Deno.test("api-token: authHeaders() sends the key verbatim, with no prefix at all", () => {
  assertEquals(authHeaders({ apiKey: "proj-1:secret" }), { authorization: "proj-1:secret" });
  assertEquals(authHeaders({}), { authorization: "" });
  // The two narrative doc pages that show `Bearer :<key>` are the ones the
  // OpenAPI security scheme overrides.
  assertEquals(PROBE_PATH, "/auth/info");
});

Deno.test("api-token: sign() stamps the raw header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: `${API_ROOT}/auth/info`,
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await apiToken.sign!(
    { request, credential: { regionId: "f1db6c", apiKey: "proj-1:secret" } },
    ctx,
  );
  assertEquals(out.headers["authorization"], "proj-1:secret");
  assert(!/bearer/i.test(out.headers["authorization"]));
});

Deno.test("api-token: test refuses a half-filled credential without a request", async () => {
  for (
    const credential of [
      { regionId: "f1db6c" },
      { apiKey: "k" },
      {},
    ] as Array<Partial<RelevanceAiCredential>>
  ) {
    const { ctx, calls } = mockCtx();
    assertEquals(await apiToken.test!({ credential }, ctx), {
      ok: false,
      message: "credential missing regionId or apiKey",
    });
    assertEquals(calls.length, 0);
  }
});

Deno.test("api-token: test probes the connection's own region host, with the key", async () => {
  const { ctx, calls } = mockCtx([{ body: authInfo() }]);
  assertEquals(
    await apiToken.test!(
      { credential: { regionId: "f1db6c", apiKey: "proj-1:secret" } },
      ctx,
    ),
    { ok: true },
  );
  assertEquals(calls[0].url, `${API_ROOT}/auth/info`);
  assertEquals(calls[0].headers["authorization"], "proj-1:secret");
});

/**
 * The finding this whole hook is shaped around: Relevance AI answers a
 * syntactically plausible WRONG key with **400**, not 401. A status-code check
 * would have called that "something else went wrong" and let a dead credential
 * through as a non-401 surprise; the body is what says which it is.
 */
Deno.test("api-token: a wrong key on HTTP 400 is a failure, classified from the body", async () => {
  const { ctx } = mockCtx([
    {
      status: 400,
      body: errorBody("unset_error_type", "User key with id AbC= not found in Postgres"),
    },
  ]);
  const out = await apiToken.test!(
    { credential: { regionId: "f1db6c", apiKey: "wrong" } },
    ctx,
  );
  assertEquals(out.ok, false);
  assert((out.message ?? "").includes("400"), out.message);
  assert((out.message ?? "").includes("not found in Postgres"), out.message);
  assert(/copied whole/.test(out.message ?? ""), out.message);
});

Deno.test("api-token: a missing header is named as a missing header", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: errorBody(
        MISSING_HEADER_ERROR_TYPE,
        "Authorization header cannot be missing or empty",
      ),
    },
  ]);
  const out = await apiToken.test!(
    { credential: { regionId: "f1db6c", apiKey: "k" } },
    ctx,
  );
  assertEquals(out.ok, false);
  assert(/no Authorization header/.test(out.message ?? ""), out.message);
  assert(/reconnect/.test(out.message ?? ""), out.message);
});

Deno.test("api-token: a non-JSON answer points at the region id first", async () => {
  const { ctx } = mockCtx([
    { status: 403, headers: { "content-type": "text/html" }, body: "<html>Forbidden</html>" },
  ]);
  const out = await apiToken.test!(
    { credential: { regionId: "nope", apiKey: "k" } },
    ctx,
  );
  assertEquals(out.ok, false);
  assert(/region id/.test(out.message ?? ""), out.message);
});

Deno.test("api-token: an unreachable host reports the region id, not the key", async () => {
  const { ctx } = mockCtx();
  // No queued response: the host is treated as unreachable.
  const out = await apiToken.test!(
    { credential: { regionId: "zzzzzz", apiKey: "k" } },
    ctx,
  );
  assertEquals(out.ok, false);
  assert((out.message ?? "").includes("api-zzzzzz.stack.tryrelevance.com"), out.message);
  assert(/region id/.test(out.message ?? ""), out.message);
});

Deno.test("api-token: afterConnect records the region id and a display name", async () => {
  const { ctx, calls } = mockCtx([{ body: authInfo() }]);
  const out = await apiToken.afterConnect!(
    { credential: { regionId: "f1db6c", apiKey: "proj-1:secret" } },
    ctx,
  );
  assertEquals(out, {
    regionId: "f1db6c",
    user: {
      id: "user-1",
      keyId: "key-1",
      email: "jo@acme.test",
      name: "Jo Ng",
      company: "Acme",
    },
  });
  assertEquals(calls[0].headers["authorization"], "proj-1:secret");
});

Deno.test("api-token: afterConnect falls back to the email when there is no name", async () => {
  const { ctx } = mockCtx([{ body: authInfo({ first_name: "", last_name: "" }) }]);
  const out = await apiToken.afterConnect!(
    { credential: { regionId: "f1db6c", apiKey: "k" } },
    ctx,
  ) as { user: { name: string } };
  assertEquals(out.user.name, "jo@acme.test");
});

Deno.test("api-token: afterConnect still records the region id when the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const out = await apiToken.afterConnect!(
    { credential: { regionId: "f1db6c", apiKey: "k" } },
    ctx,
  );
  // Without this the client could never build a URL for the connection.
  assertEquals(out, { regionId: "f1db6c" });
  assertEquals(await apiToken.afterConnect!({ credential: {} }, ctx), {});
});

/**
 * The probe's response must never carry the credential back — that is what makes
 * it safe for both `test` and `afterConnect`. The fixture is the live
 * `GetAuthHeaderInfoOutput` shape, so this guards the claim rather than the
 * wording: if someone pastes a real response that includes a key field, this
 * fails.
 */
Deno.test("api-token: the whoami shape has no credential field in it", () => {
  const fields = Object.keys(authInfo());
  assert(fields.includes("user_id"));
  assert(fields.includes("key_id"));
  for (const field of fields) {
    assert(
      !/secret|password|token|api[_-]?key|credential/i.test(field),
      `probe response carries a credential-shaped field: ${field}`,
    );
  }
});
