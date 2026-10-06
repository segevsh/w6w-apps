import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-file.ts";

Deno.test("get-file: calls GET /v1/files/file_1 on api.x.ai and returns the body", async () => {
  const reply = { ok: true };
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const result = await action.execute!({ fileId: "file_1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.x.ai");
  assertEquals(url.pathname, "/v1/files/file_1");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["authorization"], undefined);

  assertEquals(result, reply);
});

Deno.test("get-file: surfaces the vendor error code on failure", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "invalid-argument", error: "bad" } }]);
  let message = "";
  try {
    await action.execute!({ fileId: "file_1" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("400") && message.includes("[invalid-argument]"), message);
});
