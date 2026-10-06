import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import oauth2 from "../../auth/oauth2.ts";
import oauth2Sandbox from "../../auth/oauth2-sandbox.ts";

const BU = "0Uv000000000001AAA";
const sign = (a: typeof oauth2, cred: Record<string, unknown>) =>
  a.sign!(
    { request: { url: "https://x", method: "GET", headers: {} }, credential: cred } as never,
    {} as never,
  ) as unknown as {
    headers: Record<string, string>;
  };

Deno.test("oauth2: production login, pardot_api scope, refresh_token requested", () => {
  assertEquals(
    oauth2.oauth2!.authorizationUrl,
    "https://login.salesforce.com/services/oauth2/authorize",
  );
  assertEquals(oauth2.oauth2!.tokenUrl, "https://login.salesforce.com/services/oauth2/token");
  assert(oauth2.oauth2!.scopes!.includes("pardot_api"));
  assert(oauth2.oauth2!.scopes!.includes("refresh_token"));
});

Deno.test("oauth2: collects the business unit id and the environment", () => {
  assertEquals(oauth2.fields!.map((f) => f.key), ["businessUnitId", "environment"]);
  const pattern = new RegExp(oauth2.fields![0].validation!.pattern!);
  assert(pattern.test(BU));
  assert(!pattern.test("00D000000000001AAA"), "an org id is not a business unit id");
  assert(!pattern.test("0Uv123"));
});

Deno.test("oauth2: sign stamps Authorization and Pardot-Business-Unit-Id", async () => {
  const out = await sign(oauth2, { accessToken: "tok", businessUnitId: BU });
  assertEquals(out.headers["authorization"], "Bearer tok");
  assertEquals(out.headers["pardot-business-unit-id"], BU);
});

Deno.test("oauth2: test passes on a v5 query answer, with both headers on the wire", async () => {
  const { ctx, calls } = mockCtx([{ body: { values: [] } }]);
  const out = await oauth2.test(
    { credential: { accessToken: "tok", businessUnitId: BU } } as never,
    ctx,
  );
  assertEquals(out, { ok: true });
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://pi.pardot.com");
  assertEquals(url.pathname, "/api/v5/objects/campaigns");
  assertEquals(calls[0].headers["pardot-business-unit-id"], BU);
  assertEquals(calls[0].headers["authorization"], "Bearer tok");
});

Deno.test("oauth2: test uses the demo host when the environment says so", async () => {
  const { ctx, calls } = mockCtx([{ body: { values: [] } }]);
  await oauth2.test(
    { credential: { accessToken: "t", businessUnitId: BU, environment: "demo" } } as never,
    ctx,
  );
  assertEquals(new URL(calls[0].url).host, "pi.demo.pardot.com");
});

Deno.test("oauth2: test classifies from the BODY — a bad business unit is reported with its code", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: {
      code: 201,
      message: "Business Unit specified in Pardot-Business-Unit-Id header not found or inactive.",
    },
  }]);
  const out = await oauth2.test(
    { credential: { accessToken: "t", businessUnitId: BU } } as never,
    ctx,
  );
  assertEquals(out.ok, false);
  assert(out.message!.includes("[201]"));
  assert(!out.message!.includes('t"'), "no credential in the message");
});

Deno.test("oauth2: a 200 that is not the v5 shape is NOT a pass", async () => {
  const { ctx } = mockCtx([{ body: "<html>login</html>" }]);
  const out = await oauth2.test(
    { credential: { accessToken: "t", businessUnitId: BU } } as never,
    ctx,
  );
  assertEquals(out.ok, false);
});

Deno.test("oauth2: test refuses an incomplete credential without any request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await oauth2.test({ credential: { accessToken: "t" } } as never, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: afterConnect records the host and business unit on display", async () => {
  const out = await oauth2.afterConnect!(
    { credential: { accessToken: "t", businessUnitId: BU, environment: "demo" } } as never,
    {} as never,
  );
  assertEquals(out, { host: "pi.demo.pardot.com", businessUnitId: BU, org: { name: BU } });
  const prod = await oauth2.afterConnect!(
    { credential: { accessToken: "t", businessUnitId: BU } } as never,
    {} as never,
  ) as { host: string };
  assertEquals(prod.host, "pi.pardot.com");
});

Deno.test("oauth2-sandbox: signs in at test.salesforce.com and always calls the demo host", async () => {
  assertEquals(
    oauth2Sandbox.oauth2!.authorizationUrl,
    "https://test.salesforce.com/services/oauth2/authorize",
  );
  assertEquals(oauth2Sandbox.oauth2!.tokenUrl, "https://test.salesforce.com/services/oauth2/token");
  assertEquals(oauth2Sandbox.fields!.map((f) => f.key), ["businessUnitId"]);
  const { ctx, calls } = mockCtx([{ body: { values: [] } }]);
  // Even a credential claiming production is tested against the demo host.
  await oauth2Sandbox.test(
    { credential: { accessToken: "t", businessUnitId: BU, environment: "production" } } as never,
    ctx,
  );
  assertEquals(new URL(calls[0].url).host, "pi.demo.pardot.com");
  const display = await oauth2Sandbox.afterConnect!(
    { credential: { accessToken: "t", businessUnitId: BU } } as never,
    {} as never,
  ) as { host: string };
  assertEquals(display.host, "pi.demo.pardot.com");
  const out = await sign(oauth2Sandbox, { accessToken: "tok", businessUnitId: BU });
  assertEquals(out.headers["pardot-business-unit-id"], BU);
});
