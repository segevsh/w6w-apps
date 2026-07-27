import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { compact, PipedriveClient } from "../../lib/client.ts";

Deno.test("client: prefixes the v1 base and returns the parsed envelope", async () => {
  const body = { success: true, data: { id: 7, title: "Deal" } };
  const { ctx, calls } = mockCtx([{ body }]);
  const client = new PipedriveClient(ctx);
  const result = await client.request("/deals/7");

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.pipedrive.com");
  assertEquals(url.pathname, "/v1/deals/7");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: [] } }]);
  const client = new PipedriveClient(ctx);
  await client.request("/deals", {
    query: { a: "kept", b: undefined, c: null, d: "", n: 0 },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.get("n"), "0");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 404, statusText: "Not Found", body: { success: false, error: "Deal not found" } },
  ]);
  const client = new PipedriveClient(ctx);
  const err = await assertRejects(
    () => client.request("/deals/999"),
    Error,
    "Pipedrive 404",
  );
  assertEquals(err.message.includes("/v1/deals/999"), true);
  assertEquals(err.message.includes("Deal not found"), true);
});

Deno.test("client: treats a 200 with success:false as an error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { success: false, error: "bad request" } }]);
  const client = new PipedriveClient(ctx);
  await assertRejects(() => client.request("/deals"), Error, "bad request");
});

Deno.test("client: JSON-encodes the body and sets content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: { id: 1 } } }]);
  const client = new PipedriveClient(ctx);
  await client.request("/deals", { method: "POST", body: { title: "New" } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { title: "New" });
});

Deno.test("compact: drops undefined/null/empty but keeps 0 and false", () => {
  assertEquals(
    compact({ a: 1, b: 0, c: false, d: undefined, e: null, f: "", g: "x" }),
    { a: 1, b: 0, c: false, g: "x" },
  );
});
