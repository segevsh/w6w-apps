import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  compact,
  errorText,
  formatError,
  requireText,
  toList,
  toMap,
  truncate,
  WsaiClient,
} from "../../lib/client.ts";
import { pageQuery } from "../../lib/params.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: helpers", () => {
  assertEquals(compact({ a: 1, b: "", c: undefined, d: false, e: [], f: 0 }), {
    a: 1,
    d: false,
    f: 0,
  });
  assertEquals(toList(" a \n\nb "), ["a", "b"]);
  assertEquals(toList(["x", " "]), ["x"]);
  assertEquals(requireText(" x ", "L"), "x");
  assertThrows(() => requireText("", "Label"), Error, "Label is required");
  assertEquals(truncate("abcdef", 3), "abc… (6 chars truncated)");
  assertEquals(toMap(undefined, "H"), undefined);
  assertEquals(toMap('{"a":1}', "H"), { a: "1" });
  assertThrows(() => toMap("[1]", "H"), Error, "JSON object");
});

Deno.test("client: errorText reads the vendor envelope, HTML titles and plain text", () => {
  assertEquals(errorText('{"message":"Wrong API key."}'), "Wrong API key.");
  assertEquals(
    errorText('{"message":"m","error_code":"timeout","status_code":504}'),
    "timeout: m (target HTTP 504)",
  );
  assertEquals(errorText("<html><title>Oops</title></html>"), "Oops");
  assertEquals(errorText(" plain "), "plain");
  assertEquals(errorText(""), "");
  assertEquals(formatError(429, "/html", "{}").includes("concurrent"), true);
  assertEquals(formatError(504, "/html", "{}").includes("raise Timeout"), true);
});

Deno.test("client: raw puts the query on the wire — nested keys bracketed, arrays repeated, empties dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: "ok" }]);
  const res = await new WsaiClient(ctx).raw("/x", {
    a: "1",
    b: ["p", "q", ""],
    c: { k: "v" },
    d: undefined,
    e: "",
    f: false,
  });
  assertEquals(res.text, "ok");
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("a"), "1");
  assertEquals(q.getAll("b"), ["p", "q"]);
  assertEquals(q.get("c[k]"), "v");
  assertEquals(q.has("d") || q.has("e"), false);
  assertEquals(q.get("f"), "false");
});

Deno.test("client: pageQuery drops unset fields and lowercases the country", () => {
  assertEquals(pageQuery({ url: " https://e.test ", country: "FR" }), {
    url: "https://e.test",
    country: "fr",
  });
});

Deno.test("client: a non-JSON body from a JSON endpoint is an error", async () => {
  const { ctx } = mockCtx([{ body: "<html>" }]);
  await assertRejects(
    async () => await new WsaiClient(ctx).json("/account"),
    Error,
    "expected JSON",
  );
});
