import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: its endpoints are per-account, templated on the subdomain", () => {
  assertEquals(auth.type, "oauth2");
  // There is no single Zendesk OAuth host — it lives under the customer's own
  // subdomain, which is why `*.zendesk.com` is what permits the egress.
  assertEquals(
    auth.oauth2?.authorizationUrl,
    "https://{subdomain}.zendesk.com/oauth/authorizations/new",
  );
  assertEquals(auth.oauth2?.tokenUrl, "https://{subdomain}.zendesk.com/oauth/tokens");
  assertEquals(auth.fields?.[0].key, "subdomain");
});

Deno.test("oauth2: sign sets the Bearer header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://acme.zendesk.com/api/v2/tickets.json",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "tok" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer tok");
});

Deno.test("oauth2: test needs both the subdomain and the token", async () => {
  const { ctx } = mockCtx();
  assertEquals(await auth.test({ credential: { accessToken: "t" } }, ctx), {
    ok: false,
    message: "credential missing subdomain or accessToken",
  });
});
