import { assert, assertEquals } from "@std/assert";
import oauth2 from "../../auth/oauth2.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("oauth2: endpoints and comma scope separator match the reference", () => {
  assertEquals(oauth2.type, "oauth2");
  assertEquals(oauth2.oauth2!.authorizationUrl, "https://twist.com/oauth/authorize");
  assertEquals(oauth2.oauth2!.tokenUrl, "https://twist.com/oauth/access_token");
  assertEquals(oauth2.oauth2!.scopeSeparator, ",");
  assert(oauth2.oauth2!.scopes!.includes("workspaces:read"));
  assert(oauth2.oauth2!.scopes!.includes("threads:write"));
});

Deno.test("oauth2: sign stamps the access token as a bearer", async () => {
  const req = {
    url: "https://api.twist.com/x",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await oauth2.sign!(
    { request: req, credential: { accessToken: "at" } } as never,
    {} as never,
  );
  assertEquals((out as typeof req).headers, { authorization: "Bearer at" });
});

Deno.test("oauth2: test probes /workspaces/get with the access token", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  assertEquals(await oauth2.test({ credential: { accessToken: "at" } } as never, ctx), {
    ok: true,
  });
  assertEquals(pathOf(calls[0].url), "/api/v3/workspaces/get");
  assertEquals(calls[0].headers.authorization, "Bearer at");
});

Deno.test("oauth2: a rejected token fails, a missing one fails without a request", async () => {
  const bad = mockCtx([{ status: 403, body: { error_code: 200, error_string: "Invalid token" } }]);
  assertEquals(
    (await oauth2.test({ credential: { accessToken: "x" } } as never, bad.ctx)).ok,
    false,
  );
  const none = mockCtx([]);
  const r = await oauth2.test({ credential: {} } as never, none.ctx);
  assertEquals(r, { ok: false, message: "credential missing token" });
  assertEquals(none.calls.length, 0);
});

Deno.test("oauth2: afterConnect labels the connection with the user's name", async () => {
  const { ctx } = mockCtx([{ body: { id: 1, name: "Grace", token: "SECRET" } }]);
  const out = await oauth2.afterConnect!({ credential: { accessToken: "at" } } as never, ctx);
  assertEquals(out, { name: "Grace", userId: 1 });
});
