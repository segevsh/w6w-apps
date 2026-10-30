import { test } from "node:test";
import { assert, assertEquals, assertRejects, assertThrows } from "./_assert.ts";
import {
  formatSynthflowError,
  listResult,
  SynthflowClient,
  toKeyValueList,
  unwrap,
} from "../lib/client.ts";
import { errorBody, mockCtx } from "./_helpers.ts";

test("formatSynthflowError: keeps description and request_id", () => {
  const m = formatSynthflowError(400, "POST", "/v2/calls", JSON.stringify(errorBody("bad phone")));
  assert(m.includes("bad phone") && m.includes("req-test-1") && m.includes("400"));
});

test("formatSynthflowError: validation array and non-JSON bodies", () => {
  const arr = formatSynthflowError(
    422,
    "POST",
    "/p",
    JSON.stringify({ detail: [{ msg: "a" }, { msg: "b" }] }),
  );
  assert(arr.includes("a; b"));
  assert(
    formatSynthflowError(502, "GET", "/p", "<html>bad gateway</html>").includes("bad gateway"),
  );
});

test("client: a non-2xx response throws the formatted error", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("not found") }]);
  await assertRejects(() => new SynthflowClient(ctx).data("/calls/x"), Error, "not found");
});

test("client: an empty 204 body is undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await new SynthflowClient(ctx).request("/x", { method: "DELETE" }), undefined);
});

test("unwrap / listResult / toKeyValueList", () => {
  assertEquals(unwrap({ status: "ok", response: { a: 1 } }), { a: 1 });
  assertEquals(unwrap({ a: 1 }), { a: 1 });
  assertEquals(listResult(undefined, "x"), { items: [], pagination: {} });
  assertEquals(toKeyValueList(undefined, "v"), undefined);
  assertEquals(toKeyValueList({ a: 1 }, "v"), [{ key: "a", value: "1" }]);
  assertThrows(() => toKeyValueList(7, "v"), Error, "must be a JSON object");
});
