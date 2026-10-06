import { assertEquals, assertRejects } from "@std/assert";
import {
  buildQuery,
  errorText,
  FireberryClient,
  jsonValue,
  pageOutput,
  seg,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: seg, buildQuery and jsonValue", () => {
  assertEquals(seg(" a/b "), "a%2Fb");
  assertEquals(buildQuery({ a: 1, b: undefined, c: "", d: null, e: false }), "?a=1&e=false");
  assertEquals(buildQuery(undefined), "");
  assertEquals(jsonValue('{"a":1}'), { a: 1 });
  assertEquals(jsonValue("  "), undefined);
  assertEquals(jsonValue("not json"), "not json");
  assertEquals(jsonValue([1]), [1]);
});

Deno.test("client: errorText reads Message, message+error and falls back to the raw text", () => {
  assertEquals(errorText({ Message: "Invalid ids" }), "Invalid ids");
  assertEquals(
    errorText({ error: "Unauthorized", status: 401, message: "Invalid token x" }),
    "Invalid token x (Unauthorized)",
  );
  assertEquals(errorText({ error: "Unauthorized" }), "Unauthorized");
  assertEquals(errorText(undefined, "  plain  "), "plain");
});

Deno.test("client: request throws on non-2xx and on success:false, and tolerates an empty 2xx", async () => {
  const bad = mockCtx([{ status: 408, body: { Message: "timeout" } }]);
  await assertRejects(
    () => new FireberryClient(bad.ctx).request("GET", "/x"),
    Error,
    "HTTP 408 — timeout",
  );
  const f = mockCtx([{ body: { success: false, message: "nope" } }]);
  await assertRejects(() => new FireberryClient(f.ctx).request("GET", "/x"), Error, "nope");
  const empty = mockCtx([{ status: 200 }]);
  assertEquals(await new FireberryClient(empty.ctx).request("GET", "/x"), {});
});

Deno.test("client: pageOutput on an empty envelope yields no records and hasMore false", () => {
  const out = pageOutput({});
  assertEquals(out.records, []);
  assertEquals(out.hasMore, false);
});
