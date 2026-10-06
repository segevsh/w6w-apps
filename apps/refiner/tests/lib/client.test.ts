import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  asObject,
  compact,
  contactRef,
  errorMessage,
  RefinerClient,
  toList,
  truncate,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: sends no Authorization header itself — sign owns the credential", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new RefinerClient(ctx).json("/forms");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].headers.accept, "application/json");
});

Deno.test("client: arrays and objects use Refiner's bracket syntax", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new RefinerClient(ctx).json("/x", {
    query: { a: ["1", "2"], o: { k: "v", skip: undefined }, s: "t", e: "", n: null, b: false },
  });
  const u = new URL(calls[0].url);
  assertEquals(u.searchParams.getAll("a[]"), ["1", "2"]);
  assertEquals(u.searchParams.get("o[k]"), "v");
  assertEquals(u.searchParams.has("o[skip]"), false);
  assertEquals(u.searchParams.get("s"), "t");
  assertEquals(u.searchParams.has("e"), false);
  assertEquals(u.searchParams.has("n"), false);
  assertEquals(u.searchParams.get("b"), "false");
});

Deno.test("client: a JSON body gets a content-type; a GET does not", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  const c = new RefinerClient(ctx);
  await c.json("/a", { method: "post", body: { x: 1 } });
  await c.json("/b");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[1].headers["content-type"], undefined);
});

Deno.test("client: error message reads either `error` or `message`", async () => {
  assertEquals(errorMessage('{"error":"a"}'), "a");
  assertEquals(errorMessage('{"message":"b"}'), "b");
  assertEquals(errorMessage("plain text"), "plain text");
  const { ctx } = mockCtx([{
    status: 404,
    body: { message: "API key not valid or does not exist" },
  }]);
  const err = await assertRejects(() => new RefinerClient(ctx).json("/account"), Error);
  assertEquals(
    err.message,
    "Refiner GET /v1/account failed with 404: API key not valid or does not exist",
  );
});

Deno.test("client: an empty success body returns undefined; a non-JSON one is an error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: undefined }, { body: "<html>shell</html>" }]);
  const c = new RefinerClient(ctx);
  assertEquals(await c.json("/a"), undefined);
  await assertRejects(() => c.json("/b"), Error, "non-JSON body");
});

Deno.test("client: helpers", () => {
  assertEquals(compact({ a: 1, b: "", c: undefined, d: null, e: 0, f: false }), {
    a: 1,
    e: 0,
    f: false,
  });
  assertEquals(toList(" a, b ,,c"), ["a", "b", "c"]);
  assertEquals(toList(["x", " "]), ["x"]);
  assertEquals(toList(""), undefined);
  assertEquals(asObject(undefined, "x"), undefined);
  assertEquals(asObject('{"a":1}', "x"), { a: 1 });
  assertEquals(contactRef({ id: " u " }), { id: "u" });
  assert(truncate("x".repeat(400)).includes("400 bytes"));
  assertEquals(truncate("short"), "short");
});
