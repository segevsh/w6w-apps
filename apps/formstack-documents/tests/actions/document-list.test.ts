import { assert, assertEquals } from "@std/assert";
import { mockCtx, parse } from "../_helpers.ts";
import action from "../../actions/document-list.ts";

Deno.test("document-list: GETs /documents with search and folder", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "1", key: "k" }] }]);
  const out = await action.execute(
    { search: "Contract", folder: "Clients" } as never,
    ctx,
  ) as Record<string, unknown>;
  const call = calls[0];
  assertEquals(call.method, "GET");
  const url = parse(call.url);
  assertEquals(url.origin, "https://www.webmerge.me");
  assertEquals(url.pathname, "/api/documents");
  assertEquals(url.searchParams.get("search"), "Contract");
  assertEquals(url.searchParams.get("folder"), "Clients");
  assertEquals(call.body, null);
  assert(out !== null);
});

Deno.test("document-list: sends no query string when no filters are set", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  const out = await action.execute({} as never, ctx) as Record<string, unknown>;
  const call = calls[0];
  assertEquals(call.method, "GET");
  const url = parse(call.url);
  assertEquals(url.origin, "https://www.webmerge.me");
  assertEquals(url.pathname, "/api/documents");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(call.body, null);
  assert(out !== null);
});

Deno.test("document-list: declares key, type and a description", () => {
  assertEquals(action.key, "document-list");
  assertEquals(action.type, "read");
  assert(action.description!.length > 10);
});
