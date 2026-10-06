import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import apiToken from "../../auth/api-token.ts";

const WS = "https://app.timelines.ai/integrations/api/workspace";
const cred = { apiToken: "tok-123" };

Deno.test("sign: stamps the bearer header and nothing else", () => {
  const req = {
    url: WS,
    method: "GET",
    headers: { accept: "application/json" } as Record<string, string>,
  };
  const out = apiToken.sign!(
    { request: req, credential: cred } as never,
    mockCtx([]).ctx,
  ) as typeof req;
  assertEquals(out.headers["authorization"], "Bearer tok-123");
  assertEquals(out.headers["accept"], "application/json");
});

Deno.test("test: a status ok body with a workspace is a live token", async () => {
  const { ctx, calls } = mockCtx([{
    body: { status: "ok", data: { workspace_id: "w1", display_name: "Acme" } },
  }]);
  assertEquals(await apiToken.test!({ credential: cred } as never, ctx), { ok: true });
  assertEquals(calls[0].url, WS);
});

Deno.test("test: a rejected token is told apart by its body, not its status", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: {
      status: "error",
      message: "The API token is invalid or has expired.",
      error_code: "invalid_token",
    },
  }]);
  const r = await apiToken.test!({ credential: cred } as never, ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("invalid_token"), r.message);
  assert(!r.message!.includes("tok-123"), "must never echo the credential");
});

Deno.test("test: a 200 in the wrong shape is not proof of a live token", async () => {
  const { ctx } = mockCtx([{
    body: "<html>shell</html>",
    headers: { "content-type": "text/html" },
  }]);
  assertEquals((await apiToken.test!({ credential: cred } as never, ctx)).ok, false);
});

Deno.test("test: a 200 carrying status error is a failure", async () => {
  const { ctx } = mockCtx([{ body: { status: "error", error_code: "permission_denied" } }]);
  assertEquals((await apiToken.test!({ credential: cred } as never, ctx)).ok, false);
});

Deno.test("test: a missing credential fails before the network", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await apiToken.test!({ credential: {} } as never, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("afterConnect: labels the connection from the workspace, never the token", async () => {
  const { ctx } = mockCtx([{
    body: { status: "ok", data: { workspace_id: "w1", display_name: "Acme", plan: "pro" } },
  }]);
  const out = await apiToken.afterConnect!({ credential: cred } as never, ctx);
  assertEquals(out, { workspaceName: "Acme", workspaceId: "w1", plan: "pro" });
  assertEquals(JSON.stringify(out).includes("tok-123"), false);
});

Deno.test("afterConnect: a failure yields no label rather than failing the connection", async () => {
  const { ctx } = mockCtx([{ status: 500, body: { status: "error" } }]);
  assertEquals(await apiToken.afterConnect!({ credential: cred } as never, ctx), {});
});
