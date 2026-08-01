import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/batch-operation-list.ts";

Deno.test("batch-operation-list: GETs /v1/emails/operations with page params and returns the body verbatim", async () => {
  const body = { operations: [{ name: "operations/op-1", done: true }], nextPageToken: "" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ pageSize: 10, pageToken: "tok" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.mailcheck.co");
  assertEquals(url.pathname, "/v1/emails/operations");
  assertEquals(url.searchParams.get("page_size"), "10");
  assertEquals(url.searchParams.get("page_token"), "tok");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});

Deno.test("batch-operation-list: omits page params when not supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { operations: [] } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("page_size"), false);
  assertEquals(url.searchParams.has("page_token"), false);
});

Deno.test("batch-operation-list: is a read action scoped to batch with no required params", () => {
  assertEquals(action.type, "read");
  assertEquals(action.resource, "batch");
  assertEquals(action.params?.every((p) => !p.required), true);
});
