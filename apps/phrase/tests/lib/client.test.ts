import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  compact,
  csv,
  encodeId,
  formatPhraseError,
  HOSTS,
  PhraseClient,
  regionOf,
  toArray,
} from "../../lib/client.ts";
import userGet from "../../actions/user-get.ts";
import { mockCtx, withRegion } from "../_helpers.ts";

Deno.test("client: EU is the default host", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1" } }]);
  await userGet.execute({}, ctx);
  assertEquals(calls[0].url, "https://api.phrase.com/v2/user");
});

Deno.test("client: a US connection routes to the US host", async () => {
  const { ctx, calls } = withRegion(mockCtx([{ body: { id: "u1" } }]), "us");
  await userGet.execute({}, ctx);
  assertEquals(calls[0].url, "https://api.us.app.phrase.com/v2/user");
});

Deno.test("client: region parsing is forgiving and defaults to EU", () => {
  assertEquals(regionOf("US"), "us");
  assertEquals(regionOf(" us "), "us");
  assertEquals(regionOf("eu"), "eu");
  assertEquals(regionOf(undefined), "eu");
  assertEquals(regionOf("mars"), "eu");
  assertEquals(Object.values(HOSTS), ["https://api.phrase.com", "https://api.us.app.phrase.com"]);
});

Deno.test("client: sends a User-Agent and JSON accept, never an authorization header", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new PhraseClient(ctx).json("/user");
  assert(calls[0].headers["user-agent"].startsWith("w6w-phrase-app"));
  assertEquals(calls[0].headers.accept, "application/json");
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("client: JSON bodies drop unset fields but keep false and 0", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new PhraseClient(ctx).json("/x", {
    method: "POST",
    body: { a: "v", b: undefined, c: "", d: false, e: 0, f: null },
  });
  assertEquals(JSON.parse(calls[0].body!), { a: "v", d: false, e: 0 });
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("client: a 204 yields success: true", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await new PhraseClient(ctx).json("/x", { method: "DELETE" }), { success: true });
});

Deno.test("client: 401 has no body to read and says so in plain words", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "", headers: { "content-type": "text/html" } }]);
  const err = await assertRejects(() => new PhraseClient(ctx).json("/user"));
  assert(/401, empty body/.test((err as Error).message));
});

Deno.test("client: 429 names the reason header and the reset time", () => {
  const res = new Response(null, {
    status: 429,
    headers: { "x-rate-limit-reason": "global-concurrency", "x-rate-limit-reset": "1790000000" },
  });
  const msg = formatPhraseError(429, null, res);
  assert(msg.includes("global-concurrency") && msg.includes("1790000000"), msg);
});

Deno.test("client: 422 lists each offending field", () => {
  const msg = formatPhraseError(422, {
    message: "Validation failed",
    errors: [{ resource: "Key", field: "name", message: "can't be blank" }],
  });
  assert(msg.includes("Validation failed") && msg.includes("Key name can't be blank"), msg);
});

Deno.test("client: helpers", () => {
  assertEquals(encodeId(" a/b c "), "a%2Fb%20c");
  assertEquals(csv(["a", " b ", ""]), "a,b");
  assertEquals(csv("x, y"), "x,y");
  assertEquals(csv(""), undefined);
  assertEquals(toArray("a,b"), ["a", "b"]);
  assertEquals(toArray(undefined), undefined);
  assertEquals(compact({ a: 0, b: false, c: "", d: undefined }), { a: 0, b: false });
});

Deno.test("client: list falls back to the request's page when no headers say", async () => {
  const { ctx } = mockCtx([{ body: [] }]);
  const page = await new PhraseClient(ctx).list("/projects", { page: 4, per_page: 50 });
  assertEquals(page, {
    items: [],
    page: 4,
    perPage: 50,
    totalCount: undefined,
    totalPages: undefined,
    nextPage: undefined,
  });
});

Deno.test("client: a malformed Pagination header is ignored, not fatal", async () => {
  const { ctx } = mockCtx([{ headers: { pagination: "{nope" }, body: [] }]);
  const page = await new PhraseClient(ctx).list("/projects", {});
  assertEquals(page.page, 1);
});
