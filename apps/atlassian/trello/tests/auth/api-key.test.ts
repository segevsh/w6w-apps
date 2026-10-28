import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: collects the key and token as two secret fields on one row", () => {
  assertEquals(auth.key, "api-key");
  // `custom`: the credential is not a header at all — see `sign`.
  assertEquals(auth.type, "custom");
  const keys = auth.fields?.map((f) => f.key);
  assertEquals(keys, ["apiKey", "apiToken"]);
  for (const f of auth.fields!) {
    assertEquals(f.type, "secret");
    assert(f.required);
    assertEquals(f.row, "creds");
  }
});

Deno.test("api-key: sign appends key + token to the query string", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.trello.com/1/cards?name=hi",
    method: "POST",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "k1", apiToken: "t1" } }, ctx);
  const q = new URL(out.url).searchParams;
  assertEquals(q.get("key"), "k1");
  assertEquals(q.get("token"), "t1");
  assertEquals(q.get("name"), "hi", "existing query params must survive");
  assertEquals("authorization" in out.headers, false);
});

Deno.test("api-key: test refuses a half-filled credential without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: { apiKey: "k1" } }, ctx), {
    ok: false,
    message: "credential missing apiKey or apiToken",
  });
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test probes /members/me", async () => {
  const ok = mockCtx([{ body: { id: "m1" } }]);
  assertEquals(await auth.test({ credential: { apiKey: "k", apiToken: "t" } }, ok.ctx), {
    ok: true,
  });
  assert(ok.calls[0].url.startsWith("https://api.trello.com/1/members/me?"));

  const bad = mockCtx([{ status: 401, body: "unauthorized" }]);
  assertEquals(await auth.test({ credential: { apiKey: "k", apiToken: "t" } }, bad.ctx), {
    ok: false,
    message: "Trello returned 401",
  });
});

Deno.test("api-key: afterConnect labels the connection with the member", async () => {
  const { ctx } = mockCtx([{ body: { id: "m1", username: "acme", fullName: "Acme Co" } }]);
  assertEquals(await auth.afterConnect!({ credential: {} }, ctx), {
    user: { id: "m1", username: "acme", fullName: "Acme Co" },
  });
});
