import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  bit,
  buildBody,
  encodeId,
  filterQuery,
  ref,
  refs,
  UpsalesClient,
  UpsalesError,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: url drops unset query values and repeats array keys", () => {
  const c = new UpsalesClient(mockCtx().ctx);
  assertEquals(
    c.url("/orders", { a: 1, b: undefined, c: "", d: false, p: ["gte:1", "lte:99"] }),
    "https://integration.upsales.com/api/v2/orders?a=1&d=false&p=gte%3A1&p=lte%3A99",
  );
});

Deno.test("client: refs/ref/bit/encodeId helpers", () => {
  assertEquals(ref(3), { id: 3 });
  assertEquals(ref(undefined), undefined);
  assertEquals(refs("1, 2"), [{ id: 1 }, { id: 2 }]);
  assertEquals(refs([5]), [{ id: 5 }]);
  assertEquals(refs(""), undefined);
  assertEquals(bit(true), 1);
  assertEquals(bit(false), 0);
  assertEquals(bit(undefined), undefined);
  assertEquals(encodeId("../x?y"), "..%2Fx%3Fy");
  assert(!Number.isNaN(ref("4")!.id));
});

Deno.test("client: ref refuses a non-numeric id", () => {
  assertEquals(
    (() => {
      try {
        ref("abc");
      } catch (e) {
        return (e as Error).message;
      }
    })(),
    '"abc" is not a numeric id',
  );
});

Deno.test("client: buildBody lets typed values win and keeps false/0", () => {
  assertEquals(buildBody({ a: 1, b: 2 }, { b: 3, c: false, d: 0, e: undefined }), {
    a: 1,
    b: 3,
    c: false,
    d: 0,
  });
  assertEquals(buildBody(undefined, {}), {});
});

Deno.test("client: buildBody refuses a non-object fields value", () => {
  assertEquals(
    (() => {
      try {
        buildBody("[1]", {});
      } catch (e) {
        return (e as Error).message;
      }
    })(),
    "fields must be a JSON object",
  );
});

Deno.test("client: filterQuery stringifies nested values and drops token", () => {
  assertEquals(filterQuery({ token: "x", a: "gt:1", n: 5, o: { k: 1 }, z: null }), {
    a: "gt:1",
    n: 5,
    o: '{"k":1}',
  });
  assertEquals(filterQuery(undefined), {});
});

Deno.test("client: a JSON error is a UpsalesError with key and errorCode", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { error: { key: "SessionWriteLimit", code: 429, errorCode: 177, msg: "slow down" } },
  }]);
  const err = await assertRejects(
    () => new UpsalesClient(ctx).data("PUT", "/x", { body: {} }),
    UpsalesError,
    "SessionWriteLimit",
  );
  assertEquals([err.status, err.key, err.errorCode], [429, "SessionWriteLimit", 177]);
});

Deno.test("client: a 200 carrying an error object is still an error", async () => {
  const { ctx } = mockCtx([{ body: { error: { key: "Bad", msg: "no" }, data: null } }]);
  await assertRejects(() => new UpsalesClient(ctx).data("GET", "/x"), UpsalesError, "Bad");
});

Deno.test("client: a long plain-text error body is truncated", async () => {
  const { ctx } = mockCtx([{
    status: 500,
    headers: { "content-type": "text/plain" },
    body: "x".repeat(2000),
  }]);
  const err = await assertRejects(() => new UpsalesClient(ctx).data("GET", "/x"), UpsalesError);
  assert(err.message.length < 600);
});

Deno.test("client: sends content-type only when there is a body", async () => {
  const { ctx, calls } = mockCtx([{ body: { error: null } }, { body: { error: null } }]);
  const c = new UpsalesClient(ctx);
  await c.data("GET", "/x");
  await c.data("POST", "/x", { body: { a: 1 } });
  assertEquals(calls[0].headers["content-type"], undefined);
  assertEquals(calls[1].headers["content-type"], "application/json");
  assertEquals(calls[1].body, '{"a":1}');
});

Deno.test("client: list flattens metadata and tolerates a missing data array", async () => {
  const { ctx } = mockCtx([{ body: { error: null, metadata: { total: 3, limit: 2, offset: 1 } } }]);
  assertEquals(await new UpsalesClient(ctx).list("/x"), {
    data: [],
    total: 3,
    limit: 2,
    offset: 1,
  });
});
