import { assert, assertEquals, assertRejects } from "@std/assert";
import cc from "../../auth/client-credentials.ts";
import { mockCtx } from "../_helpers.ts";

const fields = {
  region: "eu1",
  clientId: "cid",
  clientSecret: "csecret",
  asUser: "jane@acme.co",
  scopes: "public.workflows.readWorkflows  public.records.readRecords",
};

Deno.test("client-credentials: exchange POSTs a form to the region's token endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: { access_token: "AT", expires_in: 21600, scope: "x" } }]);
  const out = await cc.exchange!({ fields } as never, ctx) as Record<string, string>;
  assertEquals(calls[0].url, "https://eu1.ironcladapp.com/oauth/token");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  const form = new URLSearchParams(calls[0].body!);
  assertEquals(form.get("grant_type"), "client_credentials");
  assertEquals(form.get("client_id"), "cid");
  assertEquals(form.get("scope"), "public.workflows.readWorkflows public.records.readRecords");
  assertEquals(out.accessToken, "AT");
  assertEquals(out.region, "eu1");
  assertEquals(out.asUser, "jane@acme.co");
  assert(Date.parse(out.expiresAt) > Date.now() + 5 * 3600 * 1000);
});

Deno.test("client-credentials: a wrong secret (403 unauthorized_client) is explained from the body", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { error: "unauthorized_client", error_description: "unauthorized" },
  }]);
  const err = await assertRejects(async () => await await cc.exchange!({ fields } as never, ctx));
  const msg = (err as Error).message;
  assert(msg.includes("unauthorized_client"));
  assert(msg.includes("403"));
  assert(!msg.includes("csecret"));
});

Deno.test("client-credentials: a missing acting user is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () =>
    await await cc.exchange!({ fields: { ...fields, asUser: "" } } as never, ctx)
  );
  assertEquals(calls.length, 0);
});

Deno.test("client-credentials: missing client id or secret is refused", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () =>
    await cc.exchange!({ fields: { ...fields, clientSecret: "" } } as never, ctx)
  );
  assertEquals(calls.length, 0);
});

Deno.test("client-credentials: a 200 without an access_token is a failure", async () => {
  const { ctx } = mockCtx([{ body: { hello: "world" } }]);
  await assertRejects(async () => await await cc.exchange!({ fields } as never, ctx));
});

Deno.test("client-credentials: an empty scopes field falls back to the full scope set", async () => {
  const { ctx, calls } = mockCtx([{ body: { access_token: "AT" } }]);
  await cc.exchange!({ fields: { ...fields, scopes: "" } } as never, ctx);
  const scope = new URLSearchParams(calls[0].body!).get("scope")!;
  assert(scope.includes("public.workflows.readWorkflows"));
});

Deno.test("client-credentials: refresh repeats the grant with the stored client", async () => {
  const { ctx, calls } = mockCtx([{ body: { access_token: "AT2", expires_in: 21600 } }]);
  const out = await cc.refresh!({
    credential: { region: "demo", clientId: "cid", clientSecret: "s", asUser: "u1", scope: "a b" },
  } as never, ctx) as Record<string, string>;
  assertEquals(calls[0].url, "https://demo.ironcladapp.com/oauth/token");
  assertEquals(new URLSearchParams(calls[0].body!).get("scope"), "a b");
  assertEquals(out.accessToken, "AT2");
  assertEquals(out.asUser, "u1");
});

Deno.test("client-credentials: sign adds x-as-user-email for an email, x-as-user-id otherwise", async () => {
  const sign = async (asUser: string) => {
    const req = { url: "https://x", method: "GET", headers: {} as Record<string, string> };
    const out = await cc.sign!(
      { request: req, credential: { accessToken: "t", asUser } } as never,
      {} as never,
    );
    return (out as typeof req).headers;
  };
  assertEquals(await sign("a@b.co"), { authorization: "Bearer t", "x-as-user-email": "a@b.co" });
  assertEquals(await sign("user-123"), { authorization: "Bearer t", "x-as-user-id": "user-123" });
});

Deno.test("client-credentials: test sends the acting-user header on the userinfo probe", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1", companyName: "Acme" } }]);
  const out = await cc.test!(
    { credential: { accessToken: "t", asUser: "a@b.co", region: "us" } } as never,
    ctx,
  );
  assertEquals(out.ok, true);
  assertEquals(calls[0].headers["x-as-user-email"], "a@b.co");
});

Deno.test("client-credentials: afterConnect records the region and who it acts as", async () => {
  const { ctx } = mockCtx([{ body: { id: "u1", email: "a@b.co", companyName: "Acme" } }]);
  const out = await cc.afterConnect!(
    { credential: { accessToken: "t", asUser: "a@b.co", region: "us" } } as never,
    ctx,
  ) as Record<string, string>;
  assertEquals(out.region, "us");
  assertEquals(out.companyName, "Acme");
});

Deno.test("client-credentials: the secret field is typed secret", () => {
  const f = cc.fields!.find((x) => x.key === "clientSecret")!;
  assertEquals(f.type, "secret");
});
