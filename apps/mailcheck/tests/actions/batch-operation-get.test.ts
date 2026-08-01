import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/batch-operation-get.ts";

Deno.test("batch-operation-get: GETs /v1/emails/{operation_name} and returns the operation verbatim", async () => {
  const body = { name: "operations/op-1", done: true, result: { response: { url: "https://x" } } };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ operationName: "operations/op-1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.mailcheck.co");
  assertEquals(url.pathname, "/v1/emails/operations%2Fop-1");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});

Deno.test("batch-operation-get: is a read action scoped to batch", () => {
  assertEquals(action.type, "read");
  assertEquals(action.resource, "batch");
  assertEquals(action.params?.find((p) => p.key === "operationName")?.required, true);
});
