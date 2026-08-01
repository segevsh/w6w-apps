import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: collects only the instance as a field", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.fields?.map((f) => f.key), ["instance"]);
});

Deno.test("oauth2: declares per-instance authorize/token URLs", () => {
  assertEquals(auth.oauth2?.authorizationUrl, "https://{instance}.service-now.com/oauth_auth.do");
  assertEquals(auth.oauth2?.tokenUrl, "https://{instance}.service-now.com/oauth_token.do");
  assertEquals(auth.oauth2?.pkce, false);
});

Deno.test("oauth2: sign sets a Bearer header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://acme.service-now.com/api/now/table/incident",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "tok" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer tok");
});

Deno.test("oauth2: test refuses a half-filled credential without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: { instance: "acme" } }, ctx), {
    ok: false,
    message: "credential missing instance or accessToken",
  });
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test probes sys_user_role on the instance's own host", async () => {
  const ok = mockCtx([{ body: { result: [] } }]);
  assertEquals(
    await auth.test({ credential: { instance: "acme", accessToken: "tok" } }, ok.ctx),
    { ok: true },
  );
  assertEquals(
    ok.calls[0].url,
    "https://acme.service-now.com/api/now/table/sys_user_role?sysparm_limit=1",
  );
  assertEquals(ok.calls[0].headers["authorization"], "Bearer tok");
});

Deno.test("oauth2: afterConnect records only the instance", async () => {
  const { ctx, calls } = mockCtx();
  const out = await auth.afterConnect!(
    { credential: { instance: "acme", accessToken: "tok" } },
    ctx,
  );
  assertEquals(out, { instance: "acme" });
  assertEquals(calls.length, 0);
});
