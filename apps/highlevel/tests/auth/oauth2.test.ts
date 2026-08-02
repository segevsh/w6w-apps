import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares the HighLevel authorize/token endpoints", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(
    auth.oauth2?.authorizationUrl,
    "https://marketplace.gohighlevel.com/v2/oauth/chooselocation",
  );
  assertEquals(auth.oauth2?.tokenUrl, "https://services.leadconnectorhq.com/oauth/token");
  assert(auth.oauth2?.scopes?.includes("contacts.write"));
});

Deno.test("oauth2: sign appends the Bearer access token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "at-xyz" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer at-xyz");
});

Deno.test("oauth2: test fails when the credential has no accessToken", async () => {
  const { ctx } = mockCtx();
  const result = await auth.test({ credential: { locationId: "loc-1" } }, ctx);
  assertEquals(result.ok, false);
});

Deno.test("oauth2: test fails when the credential has no locationId", async () => {
  const { ctx } = mockCtx();
  const result = await auth.test({ credential: { accessToken: "at-xyz" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("locationId"));
});

Deno.test("oauth2: test issues GET /locations/:locationId with the Version header", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { location: { id: "loc-1" } } }]);
  const result = await auth.test(
    { credential: { accessToken: "at-xyz", locationId: "loc-1" } },
    ctx,
  );
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/locations/loc-1");
  assertEquals(calls[0].headers["authorization"], "Bearer at-xyz");
  assertEquals(calls[0].headers["version"], "2021-07-28");
});

Deno.test("oauth2: afterConnect records locationId/companyId and fetches a display name", async () => {
  const { ctx, calls } = mockCtx([
    { body: { location: { name: "Acme Agency", timezone: "America/Chicago" } } },
  ]);
  const out = await auth.afterConnect!(
    { credential: { accessToken: "at-xyz", locationId: "loc-1", companyId: "co-1" } },
    ctx,
  );
  assertEquals(out, {
    locationId: "loc-1",
    companyId: "co-1",
    locationName: "Acme Agency",
    timezone: "America/Chicago",
  });
  assertEquals(new URL(calls[0].url).pathname, "/locations/loc-1");
});

Deno.test("oauth2: afterConnect is a no-op without accessToken/locationId", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await auth.afterConnect!({ credential: {} }, ctx);
  assertEquals(out, {});
  assertEquals(calls.length, 0);
});
