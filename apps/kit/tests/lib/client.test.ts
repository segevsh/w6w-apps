import { assert, assertEquals, assertRejects } from "@std/assert";
import { API_URL, KitClient, PAGE_PARAMS, pageQuery } from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: base URL is Kit v4, not the deprecated ConvertKit v3", () => {
  assertEquals(API_URL, "https://api.kit.com/v4");
});

Deno.test("client: builds an absolute URL from a relative path", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await new KitClient(ctx).request("/tags");
  assertEquals(calls[0].url, "https://api.kit.com/v4/tags");
  assertEquals(calls[0].method, "GET");
});

Deno.test("client: appends query params and skips undefined/null/empty", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new KitClient(ctx).request("/subscribers", {
    query: { per_page: 10, status: "all", after: undefined, before: null, include: "" },
  });
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("per_page"), "10");
  assertEquals(params.get("status"), "all");
  assert(!params.has("after"));
  assert(!params.has("before"));
  assert(!params.has("include"));
});

Deno.test("client: JSON-encodes a body and sets content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: { tag: {} } }]);
  await new KitClient(ctx).request("/tags", { method: "POST", body: { name: "VIP" } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { name: "VIP" });
});

Deno.test("client: never sets the auth header — `sign` injects it", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new KitClient(ctx).request("/account");
  const names = Object.keys(calls[0].headers).map((h) => h.toLowerCase());
  assert(!names.includes("x-kit-api-key"));
  assert(!names.includes("authorization"));
});

Deno.test("client: throws with status and detail on a non-2xx response", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    statusText: "Not Found",
    body: { errors: ["Not Found"] },
  }]);
  const err = await assertRejects(
    () => new KitClient(ctx).request("/tags/1/subscribers/2", { method: "DELETE" }),
    Error,
  );
  assert(err.message.includes("Kit 404"));
  assert(err.message.includes("/v4/tags/1/subscribers/2"));
});

Deno.test("client: returns undefined for 204 No Content", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const out = await new KitClient(ctx).request("/tags/1/subscribers/2", { method: "DELETE" });
  assertEquals(out, undefined);
});

Deno.test("client: returns undefined for an empty 200 body", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "" }]);
  assertEquals(await new KitClient(ctx).request("/account"), undefined);
});

Deno.test("pageQuery: maps camelCase inputs onto Kit's snake_case cursor params", () => {
  assertEquals(
    pageQuery({ after: "a", before: "b", perPage: 100, includeTotalCount: true }),
    { after: "a", before: "b", per_page: 100, include_total_count: true },
  );
});

Deno.test("pageQuery: leaves absent inputs undefined so the client drops them", () => {
  assertEquals(pageQuery({}), {
    after: undefined,
    before: undefined,
    per_page: undefined,
    include_total_count: undefined,
  });
});

Deno.test("PAGE_PARAMS: covers both cursor directions plus size and total", () => {
  assertEquals(PAGE_PARAMS.map((p) => p.key), [
    "perPage",
    "after",
    "before",
    "includeTotalCount",
  ]);
});
