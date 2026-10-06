import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  buildBody,
  compact,
  isMissingScope,
  jsonObject,
  perPage,
  readError,
  SallaApiError,
  SallaClient,
  seg,
  toArray,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("readError: reads the envelope, the fields and the OAuth server shape", () => {
  assertEquals(
    readError({ success: false, error: { code: "error", message: "m", fields: { a: ["x"] } } }),
    { code: "error", message: "m", fields: { a: ["x"] } },
  );
  assertEquals(readError({ error: "invalid_grant", error_description: "gone" }), {
    code: "invalid_grant",
    message: "gone",
  });
  assertEquals(readError({ success: true, data: {} }), undefined);
  assertEquals(readError("nope"), undefined);
});

Deno.test("isMissingScope: only the documented scope message", () => {
  assert(
    isMissingScope({ message: "The access token should have access to one of those scopes: x" }),
  );
  assert(!isMissingScope({ message: "The access token is invalid" }));
  assert(!isMissingScope(undefined));
});

Deno.test("compact / jsonObject / toArray / buildBody", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }), {
    a: 1,
    e: false,
    f: 0,
  });
  assertEquals(jsonObject(undefined, "x"), {});
  assertEquals(jsonObject('{"a":1}', "x"), { a: 1 });
  assertThrows(() => jsonObject("[1]", "x"), Error, "x must be a JSON object");
  assertThrows(() => jsonObject("{bad", "x"), Error, "x must be valid JSON");
  assertEquals(toArray("1, 2,abc", "x"), [1, 2, "abc"]);
  assertEquals(toArray("[1,2]", "x"), [1, 2]);
  assertEquals(toArray(5, "x"), [5]);
  assertEquals(toArray("", "x"), undefined);
  assertThrows(() => toArray("[1", "x"), Error, "x must be valid JSON");
  assertEquals(buildBody({ a: 1, b: undefined }, '{"a":9,"z":2}'), { a: 1, z: 2 });
});

Deno.test("perPage: accepts 1..60 and refuses anything else", () => {
  assertEquals(perPage(undefined), undefined);
  assertEquals(perPage(60), 60);
  assertEquals(perPage(1), 1);
  assertThrows(() => perPage(61), Error, "1 to 60");
  assertThrows(() => perPage(0), Error);
  assertThrows(() => perPage(2.5), Error);
});

Deno.test("seg: encodes a path segment", () => {
  assertEquals(seg("a/b c"), "a%2Fb%20c");
});

Deno.test("client: array query params use the bracket form and unset ones are dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await new SallaClient(ctx).get("/orders", { status: [1, 2], keyword: "", page: undefined, x: 0 });
  assertEquals(
    calls[0].url,
    "https://api.salla.dev/admin/v2/orders?status%5B%5D=1&status%5B%5D=2&x=0",
  );
});

Deno.test("client: a GET carries no content-type, a POST does", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }, { body: { success: true } }]);
  const c = new SallaClient(ctx);
  await c.get("/store/info");
  await c.post("/customers", { a: 1 });
  assertEquals(calls[0].headers["content-type"], undefined);
  assertEquals(calls[1].headers["content-type"], "application/json");
});

Deno.test("client: a 2xx whose body says success:false is an error, not trusted on status", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { status: 422, success: false, error: { code: "error", message: "bad" } },
  }]);
  const e = await assertRejects(() => new SallaClient(ctx).get("/x"), SallaApiError);
  assertEquals(e.status, 422);
  assertEquals(e.message, "Salla 422 for /x: bad");
});

Deno.test("client: a non-JSON 2xx body throws; a non-JSON error status still surfaces the status", async () => {
  const a = mockCtx([{ body: "<html>" }]);
  await assertRejects(() => new SallaClient(a.ctx).get("/x"), Error, "non-JSON body for /x");
  const b = mockCtx([{ status: 502, body: "Bad gateway" }]);
  const e = await assertRejects(() => new SallaClient(b.ctx).get("/x"), SallaApiError);
  assertEquals(e.status, 502);
});

Deno.test("client: field errors are listed in the message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: {
      success: false,
      error: { message: "alert.invalid_fields", fields: { name: ["a", "b"] } },
    },
  }]);
  const e = await assertRejects(() => new SallaClient(ctx).post("/x", {}), SallaApiError);
  assert(e.message.includes("[name: a, b]"), e.message);
});

Deno.test("client: delete reports deleted on 202 and 200", async () => {
  const { ctx } = mockCtx([{ status: 202, body: { status: 202, success: true } }, { status: 200 }]);
  const c = new SallaClient(ctx);
  assertEquals(await c.delete("/products/1"), { deleted: true });
  assertEquals(await c.delete("/products/2"), { deleted: true });
});
