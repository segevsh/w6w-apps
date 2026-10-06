import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  asOptionalJson,
  compact,
  encodeId,
  failureOf,
  SierraClient,
  toList,
  truncate,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("compact: drops unset values but keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: [], e: false, f: 0, g: "x" }), {
    e: false,
    f: 0,
    g: "x",
  });
});

Deno.test("encodeId: percent-encodes an email and rejects an empty id", () => {
  assertEquals(encodeId("a+b@x.com"), "a%2Bb%40x.com");
  assertThrows(() => encodeId("  "), Error, "required");
});

Deno.test("toList / asOptionalJson / truncate", () => {
  assertEquals(toList("a, b,,c"), ["a", "b", "c"]);
  assertEquals(toList(""), undefined);
  assertEquals(asOptionalJson('{"a":1}', "x"), { a: 1 });
  assertEquals(asOptionalJson({ a: 1 }, "x"), { a: 1 });
  assertThrows(() => asOptionalJson("{", "assignTo"), Error, "assignTo is not valid JSON");
  assertEquals(truncate("abc", 10), "abc");
  assertEquals(truncate("abcdef", 3).startsWith("abc…"), true);
});

Deno.test("failureOf: success:false wins even on HTTP 200; 4xx without envelope falls back", () => {
  assertEquals(failureOf(200, '{"success":false,"errorMessage":"nope"}'), "nope");
  assertEquals(
    failureOf(400, '{"success":false,"errorMessage":"Unauthorized request"}'),
    "Unauthorized request",
  );
  assertEquals(failureOf(502, "<html>bad gateway</html>"), "non-JSON error page");
  assertEquals(failureOf(200, '{"success":true}'), undefined);
  assertEquals(failureOf(200, "[1]"), undefined);
});

Deno.test("SierraClient: sends JSON body with content-type, parses the reply", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, id: 1 } }]);
  const out = await new SierraClient(ctx).request("POST", "/zapier/leads", { a: 1 });
  assertEquals(calls[0].url, "https://api.sierrainteractivedev.com/zapier/leads");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"a":1}');
  assertEquals(out, { data: { success: true, id: 1 } });
});

Deno.test("SierraClient: a 200 with success:false rejects; empty body yields null", async () => {
  const bad = mockCtx([{ body: { success: false, errorMessage: "Lead not found" } }]);
  await assertRejects(
    () => new SierraClient(bad.ctx).get("/zapier/x"),
    Error,
    "Lead not found",
  );
  const empty = mockCtx([{ status: 200 }]);
  assertEquals(await new SierraClient(empty.ctx).get("/zapier/x"), { data: null });
});
