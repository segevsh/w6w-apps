import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: is `custom`, because the key carries no auth scheme", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "custom");
  assertEquals(auth.fields?.length, 1);
  assertEquals(auth.fields![0].type, "secret");
  assert(auth.fields![0].required);
});

Deno.test("api-key: sign sends the raw key with no Bearer prefix", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.linear.app/graphql",
    method: "POST",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "lin_api_x" } }, ctx);
  // Linear rejects `Bearer lin_api_…` — the key goes in bare.
  assertEquals(out.headers["authorization"], "lin_api_x");
});

Deno.test("api-key: test refuses an empty credential without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: {} }, ctx), {
    ok: false,
    message: "credential missing apiKey",
  });
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test reports a GraphQL error returned with a 200", async () => {
  const bad = mockCtx([{
    status: 200,
    body: { errors: [{ message: "Authentication required" }] },
  }]);
  assertEquals(await auth.test({ credential: { apiKey: "x" } }, bad.ctx), {
    ok: false,
    message: "Authentication required",
  });

  const ok = mockCtx([{ body: { data: { viewer: { id: "u1" } } } }]);
  assertEquals(await auth.test({ credential: { apiKey: "x" } }, ok.ctx), { ok: true });
});

Deno.test("api-key: afterConnect labels with the user and organisation", async () => {
  const { ctx } = mockCtx([{
    body: { data: { viewer: { id: "u1", name: "Jo" }, organization: { id: "o1", name: "Acme" } } },
  }]);
  assertEquals(await auth.afterConnect!({ credential: {} }, ctx), {
    user: { id: "u1", name: "Jo" },
    organization: { id: "o1", name: "Acme" },
  });
});
