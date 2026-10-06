import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  compact,
  FortnoxApiError,
  FortnoxClient,
  jsonArray,
  jsonObject,
  readErrorInformation,
  seg,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("readErrorInformation: reads both the documented and the lower-case spelling", () => {
  assertEquals(
    readErrorInformation({
      ErrorInformation: { Error: 1, Message: "Ogiltig inloggning", Code: 2000310 },
    }),
    { code: 2000310, message: "Ogiltig inloggning" },
  );
  assertEquals(
    readErrorInformation({ ErrorInformation: { error: 1, message: "x", code: "2000311" } }),
    { code: 2000311, message: "x" },
  );
  assertEquals(readErrorInformation(undefined), undefined);
  assertEquals(readErrorInformation({ Customer: {} }), undefined);
});

Deno.test("compact: drops undefined, null and empty strings but keeps false and 0", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }), {
    a: 1,
    e: false,
    f: 0,
  });
});

Deno.test("jsonObject / jsonArray: accept objects and JSON strings, reject the wrong shape", () => {
  assertEquals(jsonObject(undefined, "x"), {});
  assertEquals(jsonObject('{"a":1}', "x"), { a: 1 });
  assertEquals(jsonArray(undefined, "x"), undefined);
  assertEquals(jsonArray("[1]", "x"), [1]);
  assertEquals(jsonArray([2], "x"), [2]);
  assert(!Array.isArray(jsonObject({ a: 1 }, "x")));
  try {
    jsonObject([1], "x");
    throw new Error("should have thrown");
  } catch (e) {
    assertEquals((e as Error).message, "x must be a JSON object");
  }
  try {
    jsonArray("{", "rows");
    throw new Error("should have thrown");
  } catch (e) {
    assertEquals((e as Error).message, "rows must be valid JSON");
  }
  try {
    jsonArray({ a: 1 }, "rows");
    throw new Error("should have thrown");
  } catch (e) {
    assertEquals((e as Error).message, "rows must be a JSON array");
  }
});

Deno.test("seg: URL-encodes a path segment", () => {
  assertEquals(seg("A/B 1"), "A%2FB%201");
  assertEquals(seg(12), "12");
});

Deno.test("client: sends accept and content-type JSON, skips empty query values", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await new FortnoxClient(ctx).get("/3/customers", {
    page: 2,
    limit: 500,
    name: "",
    city: undefined,
  });
  assertEquals(calls[0].url, "https://api.fortnox.se/3/customers?page=2&limit=500");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("client: a non-2xx answer throws FortnoxApiError carrying the vendor code", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { ErrorInformation: { Error: 1, Message: "Kunde inte hitta kund", Code: 2000204 } },
  }]);
  const err = await assertRejects(
    () => new FortnoxClient(ctx).get("/3/customers/9"),
    FortnoxApiError,
    "Kunde inte hitta kund",
  );
  assertEquals(err.status, 404);
  assertEquals(err.info?.code, 2000204);
});

Deno.test("client: an error with a non-JSON body still throws a status-only error", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "<html>bad gateway</html>", headers: {} }]);
  await assertRejects(
    () => new FortnoxClient(ctx).get("/3/me"),
    FortnoxApiError,
    "Fortnox 502 for /3/me",
  );
});

Deno.test("client: a 2xx with a non-JSON body is an error, not a silent undefined", async () => {
  const { ctx } = mockCtx([{ body: "<html></html>", headers: {} }]);
  await assertRejects(() => new FortnoxClient(ctx).get("/3/me"), Error, "non-JSON body");
});

Deno.test("client: delete returns { deleted: true } on 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  assertEquals(await new FortnoxClient(ctx).delete("/3/customers/1"), { deleted: true });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].body, null);
});
