import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-usage.ts";

Deno.test("get-usage: GETs /v2/usage and maps character fields", async () => {
  const body = { character_count: 1000, character_limit: 500000 };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({}, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/usage");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, {
    characterCount: 1000,
    characterLimit: 500000,
    documentCount: undefined,
    documentLimit: undefined,
  });
});

Deno.test("get-usage: passes through document fields when present", async () => {
  const body = {
    character_count: 1,
    character_limit: 2,
    document_count: 3,
    document_limit: 4,
  };
  const { ctx } = mockCtx([{ body }]);
  const result = await action.execute!({}, ctx);
  assertEquals(result.documentCount, 3);
  assertEquals(result.documentLimit, 4);
});
