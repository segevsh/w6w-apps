import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

const credential = { token: "tskey-api-abc", tailnet: "-" };

Deno.test("api-key: signs as a bearer token", () => {
  const request = { url: "https://x", headers: {} as Record<string, string> };
  const signed = auth.sign!({ request, credential } as never, mockCtx([]).ctx) as typeof request;
  assertEquals(signed.headers["authorization"], "Bearer tskey-api-abc");
});

Deno.test("api-key: the test lists devices in the credential's own tailnet", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { devices: [{ nodeId: "n1" }] } }]);
  const result = await auth.test!({ credential } as never, ctx);
  assertEquals(calls[0].url, "https://api.tailscale.com/api/v2/tailnet/-/devices");
  assertEquals(result.ok, true);
  assert(/1 device\b/.test(result.message!), result.message);
});

/** The expiry is the commonest way an automation here stops working. */
Deno.test("api-key: the test says the token carries a user's permissions and expires", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { devices: [] } }]);
  const result = await auth.test!({ credential } as never, ctx);
  assert(/permissions of the user who created it/.test(result.message!), result.message);
  assert(/expiry date/.test(result.message!), result.message);
});

Deno.test("api-key: a rejected token fails with the two-credentials explanation", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "API token invalid" } }]);
  const result = await auth.test!({ credential } as never, ctx);
  assertEquals(result.ok, false);
  assert(/does not say which credential is wrong/.test(result.message!), result.message);
});

Deno.test("api-key: an explicit tailnet is used and reported", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { devices: [] } }]);
  const result = await auth.test!(
    { credential: { ...credential, tailnet: "T1234CNTRL" } } as never,
    ctx,
  );
  assertEquals(calls[0].url, "https://api.tailscale.com/api/v2/tailnet/T1234CNTRL/devices");
  assert(/T1234CNTRL/.test(result.message!), result.message);
});

Deno.test("api-key: afterConnect records the tailnet and the kind, never the token", () => {
  const display = auth.afterConnect!({ credential }, mockCtx([]).ctx) as Record<string, unknown>;
  assertEquals(display.tailnet, "-");
  assertEquals(display.credentialKind, "API access token");
  assert(!JSON.stringify(display).includes("tskey"), JSON.stringify(display));
});

Deno.test("api-key: the description points at OAuth for anything long-lived", () => {
  assert(/EXPIRES after 1 to 90 days/.test(auth.description!), auth.description);
  assert(/use an OAuth client instead/.test(auth.description!), auth.description);
  assertEquals(auth.type, "bearer");
});
