import { assertEquals } from "@std/assert";
import auth from "../../auth/api-key.ts";
import { errorBody, mockCtx } from "../_helpers.ts";

const cred = { apiKey: "k-123" };

Deno.test("api-key: sign stamps x-gladia-key and nothing else", () => {
  const request = { url: "https://api.gladia.io/v2/pre-recorded", method: "GET", headers: {} };
  const out = auth.sign!({ request, credential: cred }, mockCtx().ctx) as typeof request;
  assertEquals(out.headers, { "x-gladia-key": "k-123" });
});

Deno.test("api-key: declares a required secret apiKey field", () => {
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.fields!.length, 1);
  assertEquals(auth.fields![0].type, "secret");
  assertEquals(auth.fields![0].required, true);
});

Deno.test("api-key: test passes on a job list and probes GET /v2/pre-recorded?limit=1", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [], next: null } }]);
  assertEquals((await auth.test!({ credential: cred }, ctx)).ok, true);
  assertEquals(calls[0].url, "https://api.gladia.io/v2/pre-recorded?limit=1");
  assertEquals(calls[0].headers["x-gladia-key"], "k-123");
});

Deno.test("api-key: test fails a 200 that is not a job list", async () => {
  const { ctx } = mockCtx([{ body: { hello: "world" } }]);
  assertEquals((await auth.test!({ credential: cred }, ctx)).ok, false);
});

Deno.test("api-key: 401 is classified from the body, not the status", async () => {
  const wrong = mockCtx([{ status: 401, body: errorBody(401, "gladia user not found") }]).ctx;
  const a = await auth.test!({ credential: cred }, wrong);
  assertEquals(a.ok, false);
  assertEquals(a.message?.includes("user not found"), true);

  const none = mockCtx([{ status: 401, body: errorBody(401, "no gladia key provided") }]).ctx;
  const b = await auth.test!({ credential: cred }, none);
  assertEquals(b.ok, false);
  assertEquals(b.message?.includes("received no key"), true);
});

Deno.test("api-key: a 429 proves the key was recognised; a 500 fails", async () => {
  assertEquals((await auth.test!({ credential: cred }, mockCtx([{ status: 429 }]).ctx)).ok, true);
  const res = await auth.test!({ credential: cred }, mockCtx([{ status: 500, body: "x" }]).ctx);
  assertEquals(res.ok, false);
});

Deno.test("api-key: a missing key fails without any request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await auth.test!({ credential: { apiKey: "  " } }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});
