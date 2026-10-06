import { assert, assertEquals } from "@std/assert";
import apiToken from "../../auth/api-token.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const INVALID = {
  error_code: 200,
  error_string: "Invalid token",
  error_extra: {},
  error_uuid: "u",
};

Deno.test("api-token: sign stamps the bearer header and nothing else", async () => {
  const req = {
    url: "https://api.twist.com/api/v3/workspaces/get",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await apiToken.sign!(
    { request: req, credential: { apiToken: "tok123" } } as never,
    {} as never,
  );
  assertEquals((out as typeof req).headers, { authorization: "Bearer tok123" });
});

Deno.test("api-token: declares a secret field, bearer type", () => {
  assertEquals(apiToken.type, "bearer");
  assertEquals(apiToken.fields![0].type, "secret");
});

Deno.test("api-token: test passes on a workspace list and probes /workspaces/get", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, name: "Acme" }] }]);
  assertEquals(await apiToken.test({ credential: { apiToken: "t" } } as never, ctx), { ok: true });
  assertEquals(pathOf(calls[0].url), "/api/v3/workspaces/get");
  assertEquals(calls[0].headers.authorization, "Bearer t");
});

Deno.test("api-token: the probe is never the whoami, which returns the token", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await apiToken.test({ credential: { apiToken: "t" } } as never, ctx);
  assert(!calls[0].url.includes("get_session_user"));
});

Deno.test("api-token: error_code 200 on HTTP 403 is a rejected token", async () => {
  const { ctx } = mockCtx([{ status: 403, body: INVALID }]);
  const r = await apiToken.test({ credential: { apiToken: "bad" } } as never, ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("rejected"));
});

Deno.test("api-token: the verdict follows the body, not the status (401 with code 120)", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error_code: 120, error_string: "You are not logged in" },
  }]);
  assertEquals((await apiToken.test({ credential: { apiToken: "x" } } as never, ctx)).ok, false);
});

Deno.test("api-token: an unexpected 403 error_code 109 (scope) still counts as a live token", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { error_code: 109, error_string: "Forbidden" } }]);
  const r = await apiToken.test({ credential: { apiToken: "x" } } as never, ctx);
  assertEquals(r.ok, true);
  assert(r.message!.includes("workspaces:read"));
});

Deno.test("api-token: any other Twist error is a failure with its code", async () => {
  const { ctx } = mockCtx([{
    status: 500,
    body: { error_code: 201, error_string: "Internal Server Error" },
  }]);
  const r = await apiToken.test({ credential: { apiToken: "x" } } as never, ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("201"));
});

Deno.test("api-token: a 200 that is not a workspace list is not a pass", async () => {
  const { ctx } = mockCtx([{
    body: "<html>shell</html>",
    headers: { "content-type": "text/html" },
  }]);
  assertEquals((await apiToken.test({ credential: { apiToken: "x" } } as never, ctx)).ok, false);
});

Deno.test("api-token: a blank token fails without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await apiToken.test({ credential: { apiToken: "  " } } as never, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-token: afterConnect publishes name and id only — never the token", async () => {
  const { ctx } = mockCtx([{ body: { id: 7, name: "Ada", email: "a@b.c", token: "SECRET" } }]);
  const out = await apiToken.afterConnect!({ credential: { apiToken: "t" } } as never, ctx);
  assertEquals(out, { name: "Ada", userId: 7 });
  assertEquals(JSON.stringify(out).includes("SECRET"), false);
});

Deno.test("api-token: afterConnect is silent when the whoami fails", async () => {
  const { ctx } = mockCtx([{ status: 403, body: INVALID }]);
  assertEquals(await apiToken.afterConnect!({ credential: { apiToken: "t" } } as never, ctx), {});
});
