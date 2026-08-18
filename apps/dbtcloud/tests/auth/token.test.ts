import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/token.ts";

Deno.test("token: sign sets a Bearer header", () => {
  const request = { url: "https://cloud.getdbt.com/api/v2/accounts/", method: "GET", headers: {} };
  const signed = auth.sign!({ request, credential: { token: "svc_1" } }, mockCtx().ctx) as {
    headers: Record<string, string>;
  };
  assertEquals(signed.headers["authorization"], "Bearer svc_1");
});

Deno.test("token: test probes the account list at the given access url", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [{ id: 42, name: "Acme" }] } }]);
  const result = await auth.test!(
    { credential: { token: "svc_1", accessUrl: "ab123.us1.dbt.com" } },
    ctx,
  );
  assertEquals(calls[0].url, "https://ab123.us1.dbt.com/api/v2/accounts/");
  assertEquals(result.ok, true);
  assert(result.message!.includes("Acme"), result.message);
});

Deno.test("token: a blank access url falls back to the legacy US host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [{ id: 1, name: "A" }] } }]);
  await auth.test!({ credential: { token: "svc_1" } }, ctx);
  assertEquals(calls[0].url, "https://cloud.getdbt.com/api/v2/accounts/");
});

/**
 * A valid token presented to the wrong cell answers 401 exactly like a bad one,
 * and the two have different fixes — so the message names both.
 */
Deno.test("token: a 401 reports the wrong-region possibility as well as a bad token", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { status: { user_message: "Invalid token." } } }]);
  const result = await auth.test!({ credential: { token: "svc_1" } }, ctx);
  assertEquals(result.ok, false);
  assert(/different dbt Cloud region/.test(result.message!), result.message);
});

/** Authenticating and seeing nothing is a permission-set problem, not success. */
Deno.test("token: a token that reaches no account does not connect", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { data: [] } }]);
  const result = await auth.test!({ credential: { token: "svc_1" } }, ctx);
  assertEquals(result.ok, false);
  assert(/permission sets/.test(result.message!), result.message);
});

Deno.test("token: several reachable accounts connect, and say to choose one", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { data: [{ id: 1, name: "A" }, { id: 2, name: "B" }] },
  }]);
  const result = await auth.test!({ credential: { token: "svc_1" } }, ctx);
  assertEquals(result.ok, true);
  assert(/set an Account ID/.test(result.message!), result.message);
});

Deno.test("token: any other failure reports the status and the host", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const result = await auth.test!({ credential: { token: "svc_1" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("503"), result.message);
});

Deno.test("token: a missing credential is refused before a request is made", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals((await auth.test!({ credential: {} }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

/** The account id is discovered once, so no action has to ask for it. */
Deno.test("token: afterConnect records the access url, account id and name", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { data: [{ id: 42, name: "Acme" }] } }]);
  const display = await auth.afterConnect!(
    { credential: { token: "svc_secret", accessUrl: "ab123.us1.dbt.com" } },
    ctx,
  );
  assertEquals(display, {
    accessUrl: "https://ab123.us1.dbt.com",
    accountId: "42",
    accountName: "Acme",
  });
  assert(!JSON.stringify(display).includes("svc_secret"));
});

Deno.test("token: afterConnect honours an explicitly chosen account", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { data: [{ id: 1, name: "A" }, { id: 2, name: "B" }] },
  }]);
  const display = await auth.afterConnect!(
    { credential: { token: "svc_1", accountId: "2" } },
    ctx,
  ) as { accountId: string; accountName: string };
  assertEquals(display.accountId, "2");
  assertEquals(display.accountName, "B");
});

/** Discovery failing must not block the connection — the test hook reports that. */
Deno.test("token: afterConnect still records the access url when discovery fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const display = await auth.afterConnect!({ credential: { token: "svc_1" } }, ctx) as {
    accessUrl: string;
  };
  assertEquals(display.accessUrl, "https://cloud.getdbt.com");
});

Deno.test("token: declares one secret field and two plain ones", () => {
  assertEquals(auth.fields!.map((f) => f.key), ["token", "accessUrl", "accountId"]);
  assertEquals(auth.fields![0].type, "secret");
  assert(/service token/i.test(auth.fields![0].hint!), auth.fields![0].hint);
});
