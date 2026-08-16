import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-models.ts";

Deno.test("list-models: GETs /v1/models with no query params", async () => {
  const body = { object: "list", data: [{ id: "openai/gpt-5.6-sol", object: "model" }] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({}, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/models");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].body, null);
  assertEquals(result, body);
});

Deno.test("list-models: is a read action with no params", () => {
  assertEquals(action.type, "read");
  assertEquals(action.params, []);
});
