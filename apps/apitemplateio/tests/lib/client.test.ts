import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { ApiTemplateClient } from "../../lib/client.ts";

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 404, statusText: "Not Found", body: { status: "error", message: "not found" } },
  ]);
  const client = new ApiTemplateClient(ctx);
  const err = await assertRejects(
    () => client.request("/v2/get-template"),
    Error,
    "APITemplate.io 404",
  );
  assertEquals(err.message.includes("/v2/get-template"), true);
});

Deno.test("client: throws when the API reports a 200 with status: error", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { status: "error", message: "template not found" } },
  ]);
  const client = new ApiTemplateClient(ctx);
  await assertRejects(
    () => client.request("/v2/get-template"),
    Error,
    "template not found",
  );
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  const client = new ApiTemplateClient(ctx);
  await client.request("/x", {
    query: { a: "kept", b: undefined, c: null, d: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
});

Deno.test("client: JSON body sets content-type and serializes", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  const client = new ApiTemplateClient(ctx);
  await client.request("/v2/create-pdf", {
    method: "POST",
    body: { name: "Alice" },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { name: "Alice" });
});

Deno.test("client: passes an absolute URL through unchanged", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  const client = new ApiTemplateClient(ctx);
  await client.request("https://example.internal/foo?x=1");
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://example.internal");
  assertEquals(url.pathname, "/foo");
});

Deno.test("client: non-JSON responses returned as text", async () => {
  const { ctx } = mockCtx([
    { body: "plain text body", headers: { "content-type": "text/plain" } },
  ]);
  const client = new ApiTemplateClient(ctx);
  const result = await client.request("/v2/list-templates");
  assertEquals(result, "plain text body");
});
