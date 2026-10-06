import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-files.ts";

Deno.test("list-files: calls GET /v1/files on api.x.ai and returns the body", async () => {
  const reply = { ok: true };
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const result = await action.execute!({ limit: 5, sortBy: "size", paginationToken: "tok" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.x.ai");
  assertEquals(url.pathname, "/v1/files");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["authorization"], undefined);
  const q = url.searchParams;
  assertEquals([q.get("limit"), q.get("sort_by"), q.get("pagination_token")], ["5", "size", "tok"]);
  assertEquals(result, reply);
});

Deno.test("list-files: surfaces the vendor error code on failure", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "invalid-argument", error: "bad" } }]);
  let message = "";
  try {
    await action.execute!({ limit: 5, sortBy: "size", paginationToken: "tok" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("400") && message.includes("[invalid-argument]"), message);
});
