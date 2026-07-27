import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { TodoistClient } from "../../lib/client.ts";

Deno.test("client: 204 returns undefined without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const client = new TodoistClient(ctx);
  const result = await client.request("/tasks/1/close", { method: "POST" });
  assertEquals(result, undefined);
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 404, statusText: "Not Found", body: '{"error":"NOT_FOUND"}' },
  ]);
  const client = new TodoistClient(ctx);
  const err = await assertRejects(
    () => client.request("/tasks/missing"),
    Error,
    "Todoist 404",
  );
  assertEquals(err.message.includes("/tasks/missing"), true);
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  const client = new TodoistClient(ctx);
  await client.request("/tasks", {
    query: { a: "kept", b: undefined, c: null, d: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
});

Deno.test("client: JSON body sets content-type and serializes", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }]);
  const client = new TodoistClient(ctx);
  await client.request("/tasks", { method: "POST", body: { content: "hi" } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { content: "hi" });
});

Deno.test("client: resolves relative paths against the REST v2 base", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  const client = new TodoistClient(ctx);
  await client.request("/projects");
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.todoist.com");
  assertEquals(url.pathname, "/rest/v2/projects");
});
