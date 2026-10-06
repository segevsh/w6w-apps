import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

const cred = { apiKey: "3K83KMN1AL6M1MXMVVCKR66BP9NA", apiSecret: "I51BBZ5R" };

Deno.test("api-key: is a basic method with a key and a secret field", () => {
  assertEquals(auth.type, "basic");
  assertEquals(auth.fields?.find((f) => f.key === "apiKey")?.required, true);
  assertEquals(auth.fields?.find((f) => f.key === "apiSecret")?.type, "secret");
});

Deno.test("api-key: sign sets Basic base64(key:secret)", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: cred }, ctx);
  assertEquals(
    out.headers["authorization"],
    `Basic ${btoa("3K83KMN1AL6M1MXMVVCKR66BP9NA:I51BBZ5R")}`,
  );
});

Deno.test("api-key: test passes on a JSON array and probes /api/documents", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  const r = await auth.test({ credential: cred }, ctx);
  assertEquals(r.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://www.webmerge.me/api/documents");
  assert(calls[0].headers["authorization"].startsWith("Basic "));
});

Deno.test("api-key: test fails on a 401 with an empty body", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "", headers: { "content-type": "text/html" } }]);
  const r = await auth.test({ credential: cred }, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("401"));
});

Deno.test("api-key: test fails when a 200 is not a JSON array (HTML shell)", async () => {
  const { ctx } = mockCtx([{ body: "<html></html>", headers: { "content-type": "text/html" } }]);
  const r = await auth.test({ credential: cred }, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("not the Formstack Documents API"));
});

Deno.test("api-key: test fails on a 500 and on a missing credential", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  assertEquals((await auth.test({ credential: cred }, ctx)).ok, false);
  const none = await auth.test({ credential: {} }, mockCtx().ctx);
  assertEquals(none.ok, false);
  assert(none.message?.includes("missing"));
});
