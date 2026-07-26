import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/access-token.ts";

Deno.test("access-token: is a bearer method with one secret field", () => {
  assertEquals(auth.key, "access-token");
  assertEquals(auth.type, "bearer");
  assertEquals(auth.fields?.length, 1);
  assertEquals(auth.fields![0].type, "secret");
  assert(auth.fields![0].required);
});

Deno.test("access-token: sign sets the Bearer header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.github.com/user",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "ghp_x" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer ghp_x");
});

Deno.test("access-token: test refuses an empty credential without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: {} }, ctx), {
    ok: false,
    message: "credential missing accessToken",
  });
  assertEquals(calls.length, 0);
});

Deno.test("access-token: test probes /user and reports the status", async () => {
  const ok = mockCtx([{ body: { login: "acme" } }]);
  assertEquals(await auth.test({ credential: { accessToken: "t" } }, ok.ctx), { ok: true });
  assertEquals(ok.calls[0].url, "https://api.github.com/user");

  const bad = mockCtx([{ status: 401, body: {} }]);
  assertEquals(await auth.test({ credential: { accessToken: "t" } }, bad.ctx), {
    ok: false,
    message: "GitHub returned 401",
  });
});

Deno.test("access-token: afterConnect labels the connection with the login", async () => {
  const { ctx } = mockCtx([{ body: { id: 7, login: "acme", name: "Acme" } }]);
  assertEquals(await auth.afterConnect!({ credential: {} }, ctx), {
    user: { id: 7, login: "acme", name: "Acme" },
  });
});
