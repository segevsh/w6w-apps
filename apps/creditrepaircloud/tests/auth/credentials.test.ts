import { assert, assertEquals } from "@std/assert";
import credentials, { PROBE_ID, PROBE_XML } from "../../auth/credentials.ts";
import { LEAD_VIEW } from "../../lib/client.ts";
import {
  errorResponse,
  formFieldOf,
  mockCtx,
  okResponse,
  pathOf,
  queryOf,
  unreachableCtx,
} from "../_helpers.ts";

Deno.test("credentials: declares the two secret fields and no others", () => {
  assertEquals(credentials.key, "credentials");
  // Neither field maps to a built-in auth type: `apiKey` carries one field, one
  // name and one optional prefix, and this vendor needs two query parameters.
  assertEquals(credentials.type, "custom");
  assertEquals(credentials.fields?.map((f) => f.key), ["apiauthkey", "secretkey"]);
  for (const field of credentials.fields ?? []) {
    assertEquals(field.type, "secret", field.key);
    assertEquals(field.required, true, field.key);
  }
});

Deno.test("credentials: the probe document is the vendor's own example", () => {
  assertEquals(PROBE_ID, "MQ==");
  assertEquals(PROBE_XML, "<crcloud><client><id>MQ==</id></client></crcloud>");
});

Deno.test("credentials: sign appends both credentials to the query string only", async () => {
  const request = {
    url: "https://app.creditrepaircloud.com/api/lead/insertRecord",
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "xmlData=%3Ccrcloud%3E",
  };
  const signed = await credentials.sign!({
    request,
    credential: { apiauthkey: "k1", secretkey: "s1" },
  }, mockCtx().ctx);
  const query = queryOf(signed.url);
  assertEquals(query.apiauthkey, "k1");
  assertEquals(query.secretkey, "s1");
  assertEquals(pathOf(signed.url), "/api/lead/insertRecord");
  // No header, no body: the two hooks are the only place the credential appears.
  assertEquals(signed.headers.authorization, undefined);
  assertEquals(signed.body, "xmlData=%3Ccrcloud%3E");
  assertEquals(signed.method, "POST");
});

Deno.test("credentials: test sends the probe as a form body to /api/lead/viewRecord", async () => {
  const { ctx, calls } = mockCtx([{ body: errorResponse(4413, "Incorrect Client ID") }]);
  const result = await credentials.test({
    credential: { apiauthkey: "k1", secretkey: "s1" },
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), LEAD_VIEW.path);
  assertEquals(queryOf(calls[0].url).apiauthkey, "k1");
  assertEquals(queryOf(calls[0].url).secretkey, "s1");
  assertEquals(formFieldOf(calls[0].body, "xmlData"), PROBE_XML);
  // 4413 means the credentials were accepted and the *record* was not.
  assertEquals(result.ok, true, result.message);
  assertEquals(result.ok && result.message?.includes("4413"), true);
});

Deno.test("credentials: test rejects each of the four credential-invalid codes", async () => {
  for (
    const [code, message] of [
      [4405, "Incorrect API key parameter or API key parameter value"],
      [4406, "Wrong API Key or Secret key"],
      [4407, "API Key is inactive"],
      [4411, "Incorrect Secret key parameter or Secret key parameter value"],
    ] as const
  ) {
    const { ctx } = mockCtx([{ body: errorResponse(code, message) }]);
    const result = await credentials.test({
      credential: { apiauthkey: "k1", secretkey: "s1" },
    }, ctx);
    assertEquals(result.ok, false, `code ${code} should fail`);
    assert(result.message?.includes(String(code)), `${code}: ${result.message}`);
    assert(result.message?.includes(message), `${code}: ${result.message}`);
  }
});

Deno.test("credentials: test never echoes either credential", async () => {
  const { ctx } = mockCtx([{ body: errorResponse(4406, "Wrong API Key or Secret key") }]);
  const result = await credentials.test({
    credential: { apiauthkey: "SUPER-SECRET-KEY", secretkey: "SUPER-SECRET-SECRET" },
  }, ctx);
  assertEquals(result.ok, false);
  assert(!result.message!.includes("SUPER-SECRET-KEY"), result.message);
  assert(!result.message!.includes("SUPER-SECRET-SECRET"), result.message);
});

Deno.test("credentials: test treats an accepted-but-wrong-record code as live", async () => {
  for (
    const [code, message] of [
      [4410, "Wrong ID in update"],
      [4413, "Incorrect Client ID"],
      [4417, "Incorrect Affiliate ID"],
      [4404, "XML parsing error"],
    ] as const
  ) {
    const { ctx } = mockCtx([{ body: errorResponse(code, message) }]);
    const result = await credentials.test({
      credential: { apiauthkey: "k1", secretkey: "s1" },
    }, ctx);
    assertEquals(result.ok, true, `code ${code}: ${result.message}`);
  }
});

Deno.test("credentials: test treats a successful probe as live", async () => {
  const { ctx } = mockCtx([{ body: okResponse("<id>MQ==</id>") }]);
  const result = await credentials.test({
    credential: { apiauthkey: "k1", secretkey: "s1" },
  }, ctx);
  assertEquals(result.ok, true);
  assertEquals(result.message, "the API accepted the credentials");
});

Deno.test("credentials: test fails an unreadable body rather than assuming liveness", async () => {
  const { ctx } = mockCtx([{ body: "<html>gateway</html>" }]);
  const result = await credentials.test({
    credential: { apiauthkey: "k1", secretkey: "s1" },
  }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("unreadable"), result.message);
});

Deno.test("credentials: test reports a missing field without making a call", async () => {
  for (
    const credential of [
      { apiauthkey: "", secretkey: "s1" },
      { apiauthkey: "k1", secretkey: "  " },
      {},
    ]
  ) {
    const { ctx, calls } = mockCtx();
    const result = await credentials.test({ credential }, ctx);
    assertEquals(result.ok, false);
    assertEquals(calls.length, 0);
  }
});

Deno.test("credentials: test reports an unreachable host without leaking the URL", async () => {
  const { ctx } = unreachableCtx("connect ECONNREFUSED");
  const result = await credentials.test({
    credential: { apiauthkey: "SUPER-SECRET-KEY", secretkey: "SUPER-SECRET-SECRET" },
  }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("could not reach"), result.message);
  assert(!result.message!.includes("SUPER-SECRET-KEY"), result.message);
  assert(!result.message!.includes("SUPER-SECRET-SECRET"), result.message);
});
