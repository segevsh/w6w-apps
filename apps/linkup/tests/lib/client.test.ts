import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { compact, encodeId, errorCode, errorText, LinkupClient } from "../../lib/client.ts";
import { dateOnly, jsonValue, list, schemaObject, schemaString } from "../../lib/params.ts";
import { mockCtx } from "../_helpers.ts";

const UNAUTH = {
  statusCode: 401,
  error: { code: "UNAUTHORIZED", details: [], message: "Unauthorized action" },
};

Deno.test("client: repeats array query keys and skips empties", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new LinkupClient(ctx).get("/v1/tasks", { type: ["search", "fetch"], page: 2, x: "" });
  assertEquals(calls[0].url, "https://api.linkup.so/v1/tasks?type=search&type=fetch&page=2");
});

Deno.test("client: a failure is formatted from the vendor's error object", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: {
      statusCode: 400,
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: [{ field: "outputType", message: "bad" }],
      },
    },
  }]);
  const err = await assertRejects(() => new LinkupClient(ctx).post("/v1/search", {}));
  assertEquals(
    (err as Error).message,
    "Linkup 400 for POST /v1/search: VALIDATION_ERROR Validation failed (outputType: bad)",
  );
});

Deno.test("client: 429 hint names both causes; 401 hints to reconnect", async () => {
  const a = mockCtx([{ status: 429, body: { error: { code: "TOO_MANY_REQUESTS" } } }]);
  const e1 = await assertRejects(() => new LinkupClient(a.ctx).get("/x"));
  assertEquals(/out of credits, or over 10 queries/.test((e1 as Error).message), true);
  const b = mockCtx([{ status: 401, body: UNAUTH }]);
  const e2 = await assertRejects(() => new LinkupClient(b.ctx).get("/x"));
  assertEquals(/reconnect/.test((e2 as Error).message), true);
});

Deno.test("client: a 200 that is not JSON is an error; an empty body is undefined", async () => {
  const a = mockCtx([{ body: "<html>", headers: { "content-type": "text/html" } }]);
  await assertRejects(() => new LinkupClient(a.ctx).get("/x"), Error, "not JSON");
  const b = mockCtx([{ status: 200 }]);
  assertEquals(await new LinkupClient(b.ctx).get("/x"), undefined);
});

Deno.test("client: helpers", () => {
  assertEquals(compact({ a: 1, b: "", c: null, d: undefined, e: false }), { a: 1, e: false });
  assertEquals(encodeId(" a/b "), "a%2Fb");
  assertEquals(errorCode(JSON.stringify(UNAUTH)), "UNAUTHORIZED");
  assertEquals(errorCode("nope"), undefined);
  assertEquals(errorText("plain"), "plain");
});

Deno.test("params: json, schema, list and date helpers", () => {
  assertEquals(jsonValue('{"a":1}', "x"), { a: 1 });
  assertEquals(jsonValue("  ", "x"), undefined);
  assertThrows(() => jsonValue("{", "x"), Error, "not valid JSON");
  assertThrows(() => schemaString("[1]", "s"), Error, "must be a JSON Schema object");
  assertThrows(() => dateOnly("01/02/2026", "d"), Error, "YYYY-MM-DD");
  assertEquals(schemaString({ type: "object" }, "s"), '{"type":"object"}');
  assertEquals(schemaString('{"type":"object"}', "s"), '{"type":"object"}');
  assertEquals(schemaObject('{"type":"object"}', "s"), { type: "object" });
  assertEquals(schemaString(undefined, "s"), undefined);
  assertEquals(list("a.com\n b.com, c.com"), ["a.com", "b.com", "c.com"]);
  assertEquals(list(""), undefined);
  assertEquals(dateOnly("2026-01-02", "d"), "2026-01-02");
  assertEquals(dateOnly(" ", "d"), undefined);
});
