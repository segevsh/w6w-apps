import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/basic.ts";

const credential = { tokenId: "tid", tokenSecret: "tsecret" };

Deno.test("basic: signs with HTTP Basic over the token pair", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.mux.com/video/v1/assets",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential }, ctx);
  assertEquals(out.headers["authorization"], `Basic ${btoa("tid:tsecret")}`);
});

Deno.test("basic: test reads one asset", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  const out = await auth.test!({ credential }, ctx);
  assertEquals(out.ok, true);
  assertEquals(new URL(calls[0].url).pathname, "/video/v1/assets");
});

Deno.test("basic: a bad credential is named as such", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const out = await auth.test!({ credential }, ctx);
  assertEquals(out.ok, false);
  assert(/token id or secret key/.test(out.message!), out.message);
});

/** Mux scopes tokens per product, which is a different failure. */
Deno.test("basic: a 403 blames the missing product, not the credential", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "" }]);
  const out = await auth.test!({ credential }, ctx);
  assertEquals(out.ok, false);
  assert(/Mux Video product/.test(out.message!), out.message);
});

Deno.test("basic: a missing pair never reaches the network", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals((await auth.test!({ credential: { tokenId: "x" } }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("basic: both fields are declared secret", () => {
  for (const key of ["tokenId", "tokenSecret"]) {
    assertEquals(auth.fields!.find((f) => f.key === key)!.type, "secret", key);
  }
});

/** The secret is shown once, so the hint has to say so. */
Deno.test("basic: the secret hint explains it cannot be looked up again", () => {
  const f = auth.fields!.find((f) => f.key === "tokenSecret")!;
  assert(/Shown once/.test(f.hint!), f.hint);
});
