import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  asItems,
  compact,
  encodeId,
  errorText,
  groupResult,
  parseJsonParam,
  queryString,
  sendResult,
  SolapiClient,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: compact drops empties but keeps false and 0", () => {
  assertEquals(compact({ a: "", b: null, c: undefined, d: [], e: false, f: 0, g: "x" }), {
    e: false,
    f: 0,
    g: "x",
  });
});

Deno.test("client: queryString skips empties and encodes", () => {
  assertEquals(queryString({ a: "x y", b: "", c: 3 }), "?a=x+y&c=3");
  assertEquals(queryString({}), "");
  assertEquals(encodeId(" a/b "), "a%2Fb");
});

Deno.test("client: asItems flattens an array, an id-keyed object, or nothing", () => {
  assertEquals(asItems([1, 2]), [1, 2]);
  assertEquals(asItems({ a: { id: 1 }, b: { id: 2 } }), [{ id: 1 }, { id: 2 }]);
  assertEquals(asItems(undefined), []);
});

Deno.test("client: parseJsonParam parses strings and rejects bad JSON", () => {
  assertEquals(parseJsonParam('{"a":1}', "x"), { a: 1 });
  assertEquals(parseJsonParam({ a: 1 }, "x"), { a: 1 });
  try {
    parseJsonParam("{nope", "x");
    assert(false, "should have thrown");
  } catch (e) {
    assert((e as Error).message.includes('"x" is not valid JSON'));
  }
});

Deno.test("client: errorText reads errorCode+errorMessage and the 429 `message` spelling", () => {
  assertEquals(errorText({ errorCode: "A", errorMessage: "b" }), "A: b");
  assertEquals(
    errorText({ errorCode: "TooManyRequests", message: "slow down" }),
    "TooManyRequests: slow down",
  );
  assertEquals(errorText({ errorCode: "A" }), "A");
  assertEquals(errorText(null), undefined);
});

Deno.test("client: json sends a JSON body with content-type and no credential", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: 1 } }]);
  await new SolapiClient(ctx).json("/x", { method: "POST", body: { a: 1 } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, '{"a":1}');
});

Deno.test("client: a non-JSON 200 and a non-2xx both throw", async () => {
  const html = mockCtx([{ body: "<html>", headers: {} }]);
  await assertRejects(() => new SolapiClient(html.ctx).json("/x"), Error, "not JSON");
  const bad = mockCtx([{ status: 429, body: { errorCode: "TooManyRequests", message: "slow" } }]);
  await assertRejects(
    () => new SolapiClient(bad.ctx).json("/x"),
    Error,
    "SOLAPI 429: TooManyRequests: slow",
  );
});

Deno.test("client: page returns null nextKey on the last page and handles a missing list", async () => {
  const { ctx } = mockCtx([{ body: { limit: 5 } }]);
  assertEquals(await new SolapiClient(ctx).page("/x", "messageList"), {
    items: [],
    count: 0,
    nextKey: null,
    limit: 5,
  });
});

Deno.test("client: sendResult surfaces refused messages; groupResult keeps the whole group", () => {
  const r = sendResult({
    failedMessageList: [{ to: "1" }],
    groupInfo: { groupId: "G", status: "PENDING" },
  });
  assertEquals(r.failedCount, 1);
  assertEquals(r.groupId, "G");
  assertEquals(sendResult(null).groupId, null);
  assertEquals(groupResult({ groupId: "G", status: "SENDING" }).group, {
    groupId: "G",
    status: "SENDING",
  });
});
