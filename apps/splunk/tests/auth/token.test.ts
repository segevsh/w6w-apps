import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/token.ts";

Deno.test("token: collects the stack hostname alongside the credential", () => {
  assertEquals(auth.key, "token");
  assertEquals(auth.type, "apiKey");
  const keys = auth.fields?.map((f) => f.key);
  // The stack hostname identifies the TENANT, so it belongs to the Connection
  // rather than being re-entered on every action.
  assertEquals(keys, ["stack", "token"]);
  assertEquals(auth.fields?.find((f) => f.key === "token")?.type, "secret");
  assertEquals(auth.fields?.find((f) => f.key === "stack")?.type, "string");
});

Deno.test("token: sign stamps a Bearer Authorization header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://acme.splunkcloud.com:8089/services/search/jobs",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { token: "tok" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer tok");
});

Deno.test("token: test refuses a half-filled credential without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: { stack: "acme.splunkcloud.com" } }, ctx), {
    ok: false,
    message: "credential missing stack or token",
  });
  assertEquals(calls.length, 0);
});

Deno.test("token: test probes the stack's current-context endpoint", async () => {
  const ok = mockCtx([{ body: { entry: [{ content: { username: "admin" } }] } }]);
  assertEquals(
    await auth.test(
      { credential: { stack: "acme.splunkcloud.com", token: "t" } },
      ok.ctx,
    ),
    { ok: true },
  );
  const url = new URL(ok.calls[0].url);
  assertEquals(url.hostname, "acme.splunkcloud.com");
  assertEquals(url.port, "8089");
  assertEquals(url.pathname, "/services/authentication/current-context");
  assertEquals(ok.calls[0].headers["authorization"], "Bearer t");
});

Deno.test("token: afterConnect records the stack and username for the client to use", async () => {
  const { ctx } = mockCtx([{
    body: { entry: [{ content: { username: "admin", realname: "Administrator" } }] },
  }]);
  const out = await auth.afterConnect!(
    { credential: { stack: "acme.splunkcloud.com", token: "t" } },
    ctx,
  );
  assertEquals(out, {
    stack: "acme.splunkcloud.com",
    username: "admin",
    realname: "Administrator",
  });
});

Deno.test("token: afterConnect still records the stack if the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const out = await auth.afterConnect!(
    { credential: { stack: "acme.splunkcloud.com", token: "t" } },
    ctx,
  );
  // Without this the client could never build a URL for the connection.
  assertEquals(out, { stack: "acme.splunkcloud.com" });
});
