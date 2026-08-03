import { assert, assertEquals } from "@std/assert";
import type { SignableRequest } from "@w6w/types";
import { envelope, mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";
import { API_HOSTS } from "../../lib/client.ts";

Deno.test("api-key: declares the APIKEY header scheme", () => {
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey, { in: "header", name: "APIKEY" });
});

Deno.test("api-key: the key field is a secret and the region field is required", () => {
  const apiKeyField = auth.fields?.find((f) => f.key === "apiKey");
  assertEquals(apiKeyField?.type, "secret");
  assertEquals(apiKeyField?.required, true);

  const region = auth.fields?.find((f) => f.key === "region");
  assertEquals(region?.type, "select");
  assertEquals(region?.required, true);
  assertEquals(region?.default, "us");
  assertEquals(
    (region?.options as Array<{ value: string }>).map((o) => o.value),
    ["us", "eu", "hipaa"],
  );
});

Deno.test("api-key: sign stamps the credential onto the APIKEY header", () => {
  const request: SignableRequest = {
    url: "https://api.jotform.com/user",
    method: "GET",
    headers: {},
  };
  const signed = auth.sign!(
    { request, credential: { apiKey: "sekret", region: "us" } },
    undefined as never,
  ) as SignableRequest;
  assertEquals(signed.headers["apikey"], "sekret");
});

Deno.test("api-key: test probes GET /user on the credential's region host", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ username: "johnsmith" }) }]);
  const result = await auth.test({ credential: { apiKey: "k", region: "eu" } }, ctx);

  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.host, API_HOSTS.eu);
  assertEquals(url.pathname, "/user");
  // `test` runs before a Connection exists, so it carries the credential itself.
  assertEquals(calls[0].headers["apikey"], "k");
});

Deno.test("api-key: test reports Jotform's own message on a rejected key", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: { responseCode: 401, message: "You're not authorized to use (/user) " } },
  ]);
  const result = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("not authorized"));
});

Deno.test("api-key: test fails fast when the credential has no key", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result, { ok: false, message: "credential missing apiKey" });
  assertEquals(calls.length, 0);
});

Deno.test("api-key: afterConnect records the region, host and user for the client", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ username: "johnsmith" }) }]);
  const display = await auth.afterConnect!({ credential: { region: "hipaa" } }, ctx);

  assertEquals(new URL(calls[0].url).host, API_HOSTS.hipaa);
  assertEquals(display, {
    region: "hipaa",
    apiHost: API_HOSTS.hipaa,
    user: { username: "johnsmith" },
  });
  // afterConnect is routed through `sign`; it must not carry the credential itself.
  assertEquals(calls[0].headers["apikey"], undefined);
});

Deno.test("api-key: afterConnect still records the host when the whoami fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "oops", headers: {} }]);
  const display = await auth.afterConnect!({ credential: {} }, ctx);
  assertEquals(display, { region: "us", apiHost: API_HOSTS.us });
});
