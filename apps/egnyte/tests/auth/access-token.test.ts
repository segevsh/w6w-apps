import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/access-token.ts";

Deno.test("access-token: collects the domain alongside the secret token", () => {
  assertEquals(auth.key, "access-token");
  assertEquals(auth.type, "bearer");
  assertEquals(auth.fields?.map((f) => f.key), ["domain", "accessToken"]);
  assertEquals(auth.fields?.find((f) => f.key === "accessToken")?.type, "secret");
});

Deno.test("access-token: sign sets the Bearer header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://acme.egnyte.com/pubapi/v1/userinfo",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "tok" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer tok");
});

Deno.test("access-token: test refuses a half-filled credential without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: { domain: "acme" } }, ctx), {
    ok: false,
    message: "credential missing domain or accessToken",
  });
  assertEquals(calls.length, 0);
});

Deno.test("access-token: test passes on a userinfo body, signed itself", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, username: "jo" } }]);
  assertEquals(
    await auth.test({ credential: { domain: "acme", accessToken: "tok" } }, ctx),
    { ok: true },
  );
  assertEquals(calls[0].url, "https://acme.egnyte.com/pubapi/v1/userinfo");
  assertEquals(calls[0].headers["authorization"], "Bearer tok");
});

Deno.test("access-token: a 401 fault body is a rejected token", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { fault: { faultstring: "Invalid access token" } },
  }]);
  const out = await auth.test({ credential: { domain: "acme", accessToken: "x" } }, ctx);
  assertEquals(out.ok, false);
  assertEquals(out.message, "Egnyte rejected the token (401)");
});

Deno.test("access-token: a 200 without a userinfo body is not a pass", async () => {
  const { ctx } = mockCtx([{ body: "<html>shell</html>" }]);
  const out = await auth.test({ credential: { domain: "acme", accessToken: "x" } }, ctx);
  assertEquals(out.ok, false);
});

Deno.test("access-token: afterConnect records domain and user, never the token", async () => {
  const { ctx } = mockCtx([{ body: { id: 1, username: "jo" } }]);
  const out = await auth.afterConnect!({ credential: { domain: "acme", accessToken: "tok" } }, ctx);
  assertEquals(out, { domain: "acme", user: { id: 1, username: "jo" } });
});

Deno.test("access-token: afterConnect still records the domain if the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const out = await auth.afterConnect!({ credential: { domain: "acme", accessToken: "t" } }, ctx);
  assertEquals(out, { domain: "acme" });
});
