import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  accountContext,
  assertAllowedHost,
  AUTH_HOST,
  compact,
  DocusignClient,
  jsonArray,
  jsonObject,
  normalizeBaseUri,
  selectAccount,
  type UserInfo,
  userInfoUrl,
} from "../../lib/client.ts";
import type { RedactedConnection } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";

const conn = (display: Record<string, unknown> | undefined) =>
  (display ? { display } : {}) as unknown as RedactedConnection;

// ------------------------------------------------- demo vs production hosts --

Deno.test("AUTH_HOST separates production from the developer environment", () => {
  assertEquals(AUTH_HOST.production, "account.docusign.com");
  assertEquals(AUTH_HOST.demo, "account-d.docusign.com");
});

Deno.test("userInfoUrl targets the right authentication host per environment", () => {
  assertEquals(userInfoUrl("production"), "https://account.docusign.com/oauth/userinfo");
  assertEquals(userInfoUrl("demo"), "https://account-d.docusign.com/oauth/userinfo");
});

// ------------------------------------------------------- account  selection --

const INFO: UserInfo = {
  sub: "u-1",
  name: "First Last",
  email: "first@example.com",
  accounts: [
    {
      account_id: "eu-acct",
      account_name: "Example Europe Ltd",
      base_uri: "https://eu.docusign.net",
      is_default: false,
    },
    {
      account_id: "na-acct",
      account_name: "Example Corporation",
      base_uri: "https://na3.docusign.net",
      is_default: true,
    },
  ],
};

Deno.test("selectAccount picks the default account when none is requested", () => {
  assertEquals(selectAccount(INFO).account_id, "na-acct");
});

Deno.test("selectAccount honours an explicit account id, case-insensitively", () => {
  assertEquals(selectAccount(INFO, "EU-ACCT").base_uri, "https://eu.docusign.net");
  assertEquals(selectAccount(INFO, "  eu-acct  ").account_id, "eu-acct");
});

Deno.test("selectAccount falls back to the first account when Docusign flags no default", () => {
  const noDefault: UserInfo = {
    accounts: [
      { account_id: "a", base_uri: "https://au.docusign.net" },
      { account_id: "b", base_uri: "https://ca.docusign.net" },
    ],
  };
  assertEquals(selectAccount(noDefault).account_id, "a");
});

Deno.test("selectAccount rejects an unknown account id and lists what is reachable", () => {
  const err = assertThrows(() => selectAccount(INFO, "nope")) as Error;
  assertEquals(err.message.includes("nope"), true);
  assertEquals(err.message.includes("Example Corporation (na-acct)"), true);
});

Deno.test("selectAccount rejects a userinfo response with no usable accounts", () => {
  assertThrows(() => selectAccount({ accounts: [] }));
  // An entry missing base_uri is unusable and does not count.
  assertThrows(() => selectAccount({ accounts: [{ account_id: "x" }] }));
});

// -------------------------------------------------------- base URI handling --

Deno.test("normalizeBaseUri strips trailing slashes so paths never double up", () => {
  assertEquals(normalizeBaseUri("https://na4.docusign.net/"), "https://na4.docusign.net");
  assertEquals(normalizeBaseUri("https://na4.docusign.net///"), "https://na4.docusign.net");
  assertEquals(normalizeBaseUri("https://na4.docusign.net"), "https://na4.docusign.net");
});

Deno.test("assertAllowedHost accepts every regional host under the allowlisted apex", () => {
  for (
    const host of [
      "www.docusign.net",
      "na2.docusign.net",
      "na3.docusign.net",
      "na4.docusign.net",
      "eu.docusign.net",
      "au.docusign.net",
      "ca.docusign.net",
      "jp1.docusign.net",
      "demo.docusign.net",
    ]
  ) {
    assertAllowedHost(`https://${host}`);
  }
});

Deno.test("assertAllowedHost rejects a base_uri outside the egress allowlist", () => {
  const err = assertThrows(() => assertAllowedHost("https://api.example.com")) as Error;
  assertEquals(err.message.includes("network.allow"), true);
  assertThrows(() => assertAllowedHost("not-a-url"));
});

// ------------------------------------------------------- account  context --

Deno.test("accountContext reads baseUri + accountId off the connection display", () => {
  assertEquals(
    accountContext(conn({ baseUri: "https://eu.docusign.net/", accountId: "acc-9" })),
    { baseUri: "https://eu.docusign.net", accountId: "acc-9" },
  );
});

Deno.test("accountContext fails loudly when afterConnect never recorded the routing facts", () => {
  const err = assertThrows(() => accountContext(conn(undefined))) as Error;
  assertEquals(err.message.includes("reconnect"), true);
  assertThrows(() => accountContext(conn({ baseUri: "https://eu.docusign.net" })));
  assertThrows(() => accountContext(conn({ accountId: "acc-9" })));
});

// --------------------------------------------------------------- the client --

Deno.test("DocusignClient composes {base_uri}/restapi/v2.1/accounts/{accountId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await new DocusignClient(ctx).request("/envelopes");
  assertEquals(calls[0].url, "https://na4.docusign.net/restapi/v2.1/accounts/acc-1/envelopes");
});

Deno.test("DocusignClient follows the connection to a different region", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], {
    display: { baseUri: "https://eu.docusign.net", accountId: "eu-1" },
  });
  await new DocusignClient(ctx).request("/templates");
  assertEquals(calls[0].url, "https://eu.docusign.net/restapi/v2.1/accounts/eu-1/templates");
});

Deno.test("DocusignClient routes a demo connection to demo.docusign.net", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], {
    display: { environment: "demo", baseUri: "https://demo.docusign.net", accountId: "d-1" },
  });
  const client = new DocusignClient(ctx);
  assertEquals(client.accountBase, "https://demo.docusign.net/restapi/v2.1/accounts/d-1");
  await client.request("/envelopes");
  assertEquals(new URL(calls[0].url).hostname, "demo.docusign.net");
});

Deno.test("DocusignClient refuses to construct without a connected account", () => {
  const { ctx } = mockCtx([], { display: null });
  assertThrows(() => new DocusignClient(ctx));
});

Deno.test("DocusignClient drops empty query values and JSON-encodes a body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new DocusignClient(ctx).request("/envelopes", {
    method: "POST",
    query: { a: "1", b: undefined, c: null, d: "", e: false },
    body: { status: "sent" },
  });
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("a"), "1");
  assertEquals(q.has("b"), false);
  assertEquals(q.has("c"), false);
  assertEquals(q.has("d"), false);
  assertEquals(q.get("e"), "false");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"status":"sent"}');
});

Deno.test("DocusignClient never sets an Authorization header — `sign` does that", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new DocusignClient(ctx).request("/envelopes");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("DocusignClient surfaces errorCode + message from Docusign's error envelope", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: {
      errorCode: "AUTHORIZATION_INVALID_TOKEN",
      message: "The access token provided is expired, revoked or malformed.",
    },
  }]);
  const err = await assertRejects(
    () => new DocusignClient(ctx).request("/envelopes"),
  ) as Error;
  assertEquals(err.message.includes("Docusign 401"), true);
  assertEquals(err.message.includes("AUTHORIZATION_INVALID_TOKEN"), true);
  assertEquals(err.message.includes("expired, revoked or malformed"), true);
});

Deno.test("DocusignClient falls back to the raw body when the error is not JSON", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "<html>bad gateway</html>" }]);
  const err = await assertRejects(() => new DocusignClient(ctx).request("/envelopes")) as Error;
  assertEquals(err.message.includes("bad gateway"), true);
});

Deno.test("DocusignClient returns undefined for 204 and for an empty body", async () => {
  const { ctx } = mockCtx([{ status: 204 }, { status: 200, body: "" }]);
  const client = new DocusignClient(ctx);
  assertEquals(await client.request("/envelopes/x"), undefined);
  assertEquals(await client.request("/envelopes/y"), undefined);
});

Deno.test("DocusignClient returns the raw Response when asked", async () => {
  const { ctx } = mockCtx([{ body: "PDF", headers: { "content-type": "application/pdf" } }]);
  const res = await new DocusignClient(ctx).request<Response>("/x", { raw: true });
  assertEquals(res.headers.get("content-type"), "application/pdf");
  assertEquals(await res.text(), "PDF");
});

// --------------------------------------------------------------- JSON parsing --

Deno.test("jsonObject accepts objects and rejects anything else", () => {
  assertEquals(jsonObject('{"a":1}', "p"), { a: 1 });
  assertEquals(jsonObject({ a: 1 }, "p"), { a: 1 });
  assertEquals(jsonObject("", "p"), {});
  assertEquals(jsonObject(undefined, "p"), {});
  assertThrows(() => jsonObject("[1]", "recipients"), Error, "`recipients` must be a JSON object.");
  assertThrows(() => jsonObject("null", "p"));
});

Deno.test("jsonArray accepts arrays and rejects anything else", () => {
  assertEquals(jsonArray('[{"a":1}]', "p"), [{ a: 1 }]);
  assertEquals(jsonArray([1, 2], "p"), [1, 2]);
  assertEquals(jsonArray("", "p"), []);
  assertThrows(() => jsonArray('{"a":1}', "documents"), Error, "`documents` must be a JSON array.");
});

Deno.test("compact drops undefined, null and empty-string values", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }), {
    a: 1,
    e: false,
    f: 0,
  });
});
