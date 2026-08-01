import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { CodaClient, toCells } from "../../lib/client.ts";

Deno.test("CodaClient: builds the full URL against the API base and drops empty query values", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  const client = new CodaClient(ctx);
  await client.request("/docs", { query: { limit: 25, pageToken: undefined, query: "" } });
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://coda.io/apis/v1/docs");
  assertEquals(url.searchParams.get("limit"), "25");
  assertEquals(url.searchParams.has("pageToken"), false);
  assertEquals(url.searchParams.has("query"), false);
});

Deno.test("CodaClient: throws with response detail on a non-ok response", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "doc not found" } }]);
  const client = new CodaClient(ctx);
  let threw = false;
  try {
    await client.request("/docs/missing");
  } catch (err) {
    threw = true;
    assertEquals((err as Error).message.includes("404"), true);
  }
  assertEquals(threw, true);
});

Deno.test("CodaClient: returns undefined for a 204 response", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const client = new CodaClient(ctx);
  const out = await client.request("/docs/x");
  assertEquals(out, undefined);
});

Deno.test("toCells: converts a column->value map into Coda's cells array", () => {
  const cells = toCells({ Name: "Widget", "c-price": 9.99 });
  assertEquals(cells, [
    { column: "Name", value: "Widget" },
    { column: "c-price", value: 9.99 },
  ]);
});
