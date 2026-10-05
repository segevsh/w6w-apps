import { assertEquals, assertThrows } from "@std/assert";
import {
  compact,
  formatSamCartError,
  intId,
  page,
  SamCartClient,
  seg,
  toIntList,
} from "../lib/client.ts";
import { mockCtx, pathOf } from "./_helpers.ts";

Deno.test("client: intId accepts positive integers only", () => {
  assertEquals(intId(" 42 "), "42");
  for (const bad of ["", "0", "-1", "1.5", "1/2", "abc", undefined, null, "01"]) {
    assertThrows(() => intId(bad), Error, "positive integer");
  }
});

Deno.test("client: seg encodes one path segment", () => {
  assertEquals(seg("a/b c"), "a%2Fb%20c");
});

Deno.test("client: compact keeps false and 0, drops unset", () => {
  assertEquals(compact({ a: false, b: 0, c: "", d: null, e: undefined, f: "x" }), {
    a: false,
    b: 0,
    f: "x",
  });
});

Deno.test("client: toIntList parses, trims and validates", () => {
  assertEquals(toIntList("1, 2,3", "ids"), [1, 2, 3]);
  assertEquals(toIntList([4, "5"], "ids"), [4, 5]);
  assertThrows(() => toIntList("1,x", "ids"), Error, "positive integer");
});

Deno.test("client: page extracts the next offset from the next URL", () => {
  const p = page({
    data: [{ id: 1 }],
    pagination: { next: "https://api.samcart.com/v1/orders?offset=1337&dir=next", prev: null },
  });
  assertEquals(p.nextOffset, "1337");
  assertEquals(p.prev, null);
  assertEquals(page({ data: [], pagination: { next: null, prev: null } }).nextOffset, null);
  assertEquals(page(null), { data: [], next: null, prev: null, nextOffset: null });
});

Deno.test("client: error bodies keep the vendor message, both shapes", () => {
  assertEquals(
    formatSamCartError(401, "GET", "/v1/x", '{"message":"Invalid authentication credentials"}')
      .includes("Invalid authentication credentials"),
    true,
  );
  assertEquals(
    formatSamCartError(400, "GET", "/v1/x", '{"success":false,"error":"Validation error"}')
      .includes("Validation error"),
    true,
  );
  assertEquals(formatSamCartError(500, "GET", "/v1/x", "boom").includes("boom"), true);
});

Deno.test("client: sends accept, drops empty query values and never an auth header", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await new SamCartClient(ctx).call("GET", "/orders", { query: { a: "1", b: "", c: undefined } });
  assertEquals(pathOf(calls[0].url), "/v1/orders");
  assertEquals(new URL(calls[0].url).search, "?a=1");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["sc-api"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: an empty 2xx body is null, not a parse error", async () => {
  const { ctx } = mockCtx([{ status: 200 }]);
  assertEquals(await new SamCartClient(ctx).call("POST", "/x"), null);
});

Deno.test("client: a non-JSON 2xx body is reported", async () => {
  const { ctx } = mockCtx([{ body: "<html>" }]);
  let message = "";
  try {
    await new SamCartClient(ctx).call("GET", "/x");
  } catch (e) {
    message = String(e);
  }
  assertEquals(message.includes("expected JSON"), true);
});
