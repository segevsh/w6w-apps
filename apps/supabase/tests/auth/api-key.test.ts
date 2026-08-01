import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: collects projectUrl alongside the secret key", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  const keys = auth.fields?.map((f) => f.key);
  assertEquals(keys, ["projectUrl", "apiKey"]);
  assertEquals(auth.fields?.find((f) => f.key === "apiKey")?.type, "secret");
  assertEquals(auth.fields?.find((f) => f.key === "projectUrl")?.type, "string");
});

Deno.test("api-key: sign stamps both apikey and Authorization: Bearer with the same key", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://abc.supabase.co/rest/v1/todos",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!(
    { request, credential: { projectUrl: "https://abc.supabase.co", apiKey: "the-key" } },
    ctx,
  );
  assertEquals(out.headers["apikey"], "the-key");
  assertEquals(out.headers["authorization"], "Bearer the-key");
});

Deno.test("api-key: test refuses a half-filled credential without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: { projectUrl: "https://abc.supabase.co" } }, ctx), {
    ok: false,
    message: "credential missing projectUrl or apiKey",
  });
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test probes the project's own PostgREST root with both headers", async () => {
  const ok = mockCtx([{ body: { swagger: "2.0" } }]);
  assertEquals(
    await auth.test({
      credential: { projectUrl: "https://abc.supabase.co", apiKey: "the-key" },
    }, ok.ctx),
    { ok: true },
  );
  assertEquals(ok.calls[0].url, "https://abc.supabase.co/rest/v1/");
  assertEquals(ok.calls[0].headers["apikey"], "the-key");
  assertEquals(ok.calls[0].headers["authorization"], "Bearer the-key");
});

Deno.test("api-key: test reports failure on a non-ok response", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Invalid API key" } }]);
  assertEquals(
    await auth.test({
      credential: { projectUrl: "https://abc.supabase.co", apiKey: "bad" },
    }, ctx),
    { ok: false, message: "Supabase returned 401" },
  );
});

Deno.test("api-key: afterConnect records projectUrl and derives the project ref", async () => {
  const { ctx } = mockCtx();
  const out = await auth.afterConnect!(
    { credential: { projectUrl: "https://abcdefgh.supabase.co" } },
    ctx,
  );
  assertEquals(out, {
    projectUrl: "https://abcdefgh.supabase.co",
    project: { ref: "abcdefgh" },
  });
});

Deno.test("api-key: afterConnect is a no-op without a projectUrl", async () => {
  const { ctx } = mockCtx();
  const out = await auth.afterConnect!({ credential: {} }, ctx);
  assert(!("projectUrl" in out));
});
