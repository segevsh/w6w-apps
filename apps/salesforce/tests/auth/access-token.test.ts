import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/access-token.ts";

Deno.test("access-token: collects the instance URL alongside the token", () => {
  assertEquals(auth.key, "access-token");
  assertEquals(auth.type, "bearer");
  assertEquals(auth.fields?.map((f) => f.key), ["instanceUrl", "accessToken"]);
  assertEquals(auth.fields?.find((f) => f.key === "accessToken")?.type, "secret");
});

Deno.test("access-token: sign sets the Bearer header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://acme.my.salesforce.com/x",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "tok" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer tok");
});

Deno.test("access-token: test refuses a half-filled credential without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: { accessToken: "t" } }, ctx), {
    ok: false,
    message: "credential missing instanceUrl or accessToken",
  });
  assertEquals(calls.length, 0);
});

Deno.test("access-token: test probes /limits on the org host", async () => {
  const ok = mockCtx([{ body: { DailyApiRequests: {} } }]);
  assertEquals(
    await auth.test(
      { credential: { instanceUrl: "https://acme.my.salesforce.com", accessToken: "t" } },
      ok.ctx,
    ),
    { ok: true },
  );
  assertEquals(
    ok.calls[0].url,
    "https://acme.my.salesforce.com/services/data/v60.0/limits",
  );
});

Deno.test("access-token: afterConnect records the instance URL without a trailing slash", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(
    await auth.afterConnect!(
      { credential: { instanceUrl: "https://acme.my.salesforce.com/" } },
      ctx,
    ),
    { instanceUrl: "https://acme.my.salesforce.com", org: { name: "acme" } },
  );
  assertEquals(calls.length, 0, "no network call is needed to record what was typed");
});
