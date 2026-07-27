import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/access-token.ts";

Deno.test("access-token: is a custom method with a secret token and an optional baseUrl", () => {
  assertEquals(auth.key, "access-token");
  assertEquals(auth.type, "custom");
  assertEquals(auth.fields?.length, 2);
  assertEquals(auth.fields![0].key, "accessToken");
  assertEquals(auth.fields![0].type, "secret");
  assert(auth.fields![0].required);
  assertEquals(auth.fields![1].key, "baseUrl");
  assertEquals(auth.fields![1].required, false);
});

Deno.test("access-token: sign sets the PRIVATE-TOKEN header, not Authorization", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://gitlab.com/api/v4/user",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "glpat-x" } }, ctx);
  assertEquals(out.headers["private-token"], "glpat-x");
  assertEquals("authorization" in out.headers, false);
});

Deno.test("access-token: test refuses an empty credential without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: {} }, ctx), {
    ok: false,
    message: "credential missing accessToken",
  });
  assertEquals(calls.length, 0);
});

Deno.test("access-token: test probes /user on GitLab.com and reports the status", async () => {
  const ok = mockCtx([{ body: { username: "acme" } }]);
  assertEquals(await auth.test({ credential: { accessToken: "t" } }, ok.ctx), { ok: true });
  assertEquals(ok.calls[0].url, "https://gitlab.com/api/v4/user");
  assertEquals(ok.calls[0].headers["private-token"], "t");

  const bad = mockCtx([{ status: 401, body: {} }]);
  assertEquals(await auth.test({ credential: { accessToken: "t" } }, bad.ctx), {
    ok: false,
    message: "GitLab returned 401",
  });
});

Deno.test("access-token: test probes a self-managed instance when baseUrl is given", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await auth.test({ credential: { accessToken: "t", baseUrl: "https://gitlab.example.com" } }, ctx);
  assertEquals(calls[0].url, "https://gitlab.example.com/api/v4/user");
});

Deno.test("access-token: afterConnect publishes baseUrl and the user for the label", async () => {
  const { ctx } = mockCtx([{ body: { id: 7, username: "acme", name: "Acme" } }]);
  assertEquals(await auth.afterConnect!({ credential: {} }, ctx), {
    baseUrl: "https://gitlab.com",
    user: { id: 7, username: "acme", name: "Acme" },
  });
});
