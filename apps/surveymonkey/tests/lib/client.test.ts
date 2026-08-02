import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { compact, SurveyMonkeyClient } from "../../lib/client.ts";

Deno.test("client: 204 returns undefined without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const result = await new SurveyMonkeyClient(ctx).request("/surveys/s1", { method: "DELETE" });
  assertEquals(result, undefined);
});

Deno.test("client: empty 200 body returns undefined", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "", headers: {} }]);
  const result = await new SurveyMonkeyClient(ctx).request("/surveys/s1", { method: "PUT" });
  assertEquals(result, undefined);
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 404, statusText: "Not Found", body: '{"error":{"name":"Not Found"}}' },
  ]);
  const client = new SurveyMonkeyClient(ctx);
  const err = await assertRejects(
    () => client.request("/surveys/missing"),
    Error,
    "SurveyMonkey 404",
  );
  assertEquals(err.message.includes("/surveys/missing"), true);
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new SurveyMonkeyClient(ctx).request("/surveys", {
    query: { a: "kept", b: undefined, c: null, d: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
});

Deno.test("client: JSON body sets content-type and serializes", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "abc" } }]);
  await new SurveyMonkeyClient(ctx).request("/surveys", {
    method: "POST",
    body: { title: "My survey" },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { title: "My survey" });
});

Deno.test("client: never sets Authorization itself", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new SurveyMonkeyClient(ctx).request("/users/me");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("compact: drops undefined/null/empty values", () => {
  assertEquals(compact({ a: "x", b: undefined, c: null, d: "", e: 0, f: false }), {
    a: "x",
    e: 0,
    f: false,
  });
});
