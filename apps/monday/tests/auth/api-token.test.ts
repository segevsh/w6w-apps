import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-token.ts";

Deno.test("api-token: is `custom`, because the token carries no auth scheme", () => {
  assertEquals(auth.key, "api-token");
  assertEquals(auth.type, "custom");
  assertEquals(auth.fields?.length, 1);
  assertEquals(auth.fields![0].type, "secret");
  assert(auth.fields![0].required);
});

Deno.test("api-token: sign sends the raw token with no Bearer prefix", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.monday.com/v2",
    method: "POST",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiToken: "eyJ_x" } }, ctx);
  // monday rejects `Bearer eyJ…` — the token goes in bare.
  assertEquals(out.headers["authorization"], "eyJ_x");
});

Deno.test("api-token: test refuses an empty credential without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: {} }, ctx), {
    ok: false,
    message: "credential missing apiToken",
  });
  assertEquals(calls.length, 0);
});

Deno.test("api-token: test reports a GraphQL error returned with a 200", async () => {
  const bad = mockCtx([{ status: 200, body: { errors: [{ message: "Not authenticated" }] } }]);
  assertEquals(await auth.test({ credential: { apiToken: "x" } }, bad.ctx), {
    ok: false,
    message: "Not authenticated",
  });

  const ok = mockCtx([{ body: { data: { me: { id: "u1" } } } }]);
  assertEquals(await auth.test({ credential: { apiToken: "x" } }, ok.ctx), { ok: true });
});

Deno.test("api-token: test sends the raw token and the me query", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { me: { id: "u1" } } } }]);
  await auth.test({ credential: { apiToken: "raw_tok" } }, ctx);
  assertEquals(calls[0].headers["authorization"], "raw_tok");
  assertEquals(JSON.parse(calls[0].body!).query.includes("me { id name }"), true);
});

Deno.test("api-token: afterConnect labels with the current user", async () => {
  const { ctx } = mockCtx([{ body: { data: { me: { id: "u1", name: "Jo", email: "j@x.io" } } } }]);
  assertEquals(await auth.afterConnect!({ credential: {} }, ctx), {
    user: { id: "u1", name: "Jo", email: "j@x.io" },
  });
});
