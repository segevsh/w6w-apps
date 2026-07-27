import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { ClickUpClient, compact } from "../../lib/client.ts";

Deno.test("client: builds URL against the v2 base and drops empty query values", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await new ClickUpClient(ctx).request("/task/abc", {
    query: { archived: true, page: 0, order_by: undefined, blank: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.clickup.com");
  assertEquals(url.pathname, "/api/v2/task/abc");
  assertEquals(url.searchParams.get("archived"), "true");
  assertEquals(url.searchParams.get("page"), "0");
  assertEquals(url.searchParams.has("order_by"), false);
  assertEquals(url.searchParams.has("blank"), false);
});

Deno.test("client: never sets an Authorization header (sign does that)", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new ClickUpClient(ctx).request("/user");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: JSON-encodes the body and compacts empty fields", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new ClickUpClient(ctx).request("/list/1/task", {
    method: "POST",
    body: { name: "T", content: undefined, status: "" },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { name: "T" });
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("client: throws a descriptive error on non-2xx", async () => {
  const { ctx } = mockCtx([{ status: 401, statusText: "Unauthorized", body: { err: "no" } }]);
  await assertRejects(
    () => new ClickUpClient(ctx).request("/user"),
    Error,
    "ClickUp 401",
  );
});

Deno.test("compact: strips undefined, null and empty-string values", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: "x" }), { a: 1, e: "x" });
});
