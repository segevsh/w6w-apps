import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  buildUrl,
  call,
  ClozeError,
  parseJsonField,
  parseList,
  pick,
  requireStr,
} from "../../lib/client.ts";
import { PERSON, PROJECT, recordBody, writeRecord } from "../../lib/records.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("buildUrl skips unset values and encodes the rest", () => {
  assertEquals(
    buildUrl("/v1/x", { a: "b c", n: 0, no: undefined, e: "", z: null, f: false }),
    "https://api.cloze.com/v1/x?a=b+c&n=0&f=false",
  );
});

Deno.test("requireStr trims and rejects empty", () => {
  assertEquals(requireStr("id", " k "), "k");
  assertThrows(() => requireStr("id", "  "), Error, "id is required");
});

Deno.test("pick drops empty values but keeps false and 0", () => {
  assertEquals(pick({ a: "", b: null, c: false, d: 0, e: "x" }, ["a", "b", "c", "d", "e"]), {
    c: false,
    d: 0,
    e: "x",
  });
});

Deno.test("parseList takes arrays, JSON text and comma text", () => {
  assertEquals(parseList("k", ["a"]), ["a"]);
  assertEquals(parseList("k", '["a","b"]'), ["a", "b"]);
  assertEquals(parseList("k", " a, b ,,c "), ["a", "b", "c"]);
  assertEquals(parseList("k", ""), []);
  assertThrows(() => parseList("k", "[oops"), Error, "k must be valid JSON");
  assertThrows(() => parseList("k", '{"a":1}'), Error, "must be a JSON array");
});

Deno.test("parseJsonField parses text and passes data through", () => {
  assertEquals(parseJsonField("k", '{"a":1}'), { a: 1 });
  assertEquals(parseJsonField("k", [1]), [1]);
});

Deno.test("call strips errorcode, sends JSON bodies and surfaces ClozeError", async () => {
  const { ctx, calls } = mockCtx([{ body: { errorcode: 0, x: 1 } }, {
    status: 404,
    body: { errorcode: 404, message: "Resource Not Found" },
  }]);
  assertEquals(await call(ctx, "POST", "/v1/x", { body: { a: 1 } }), { x: 1 });
  assertEquals(calls[0].headers["content-type"], "application/json");
  const err = await assertRejects(() => call(ctx, "GET", "/v1/y"), ClozeError);
  assertEquals(err.status, 404);
  assertEquals(err.errorcode, 404);
  assertEquals(err.vendorMessage, "Resource Not Found");
});

Deno.test("call tolerates an empty body and a non-JSON failure body", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "" }, {
    status: 502,
    body: "bad gateway",
    headers: {},
  }]);
  assertEquals(await call(ctx, "GET", "/v1/x"), {});
  const err = await assertRejects(() => call(ctx, "GET", "/v1/y"), ClozeError);
  assertEquals(err.vendorMessage, "bad gateway");
});

Deno.test("recordBody merges the e-mail/phone shortcuts into the arrays", () => {
  assertEquals(
    recordBody(PERSON, { email: "a@b.com", emails: '[{"value":"c@d.com"}]', phone: "+1555" }),
    { emails: [{ value: "c@d.com" }, { value: "a@b.com" }], phones: [{ value: "+1555" }] },
  );
});

Deno.test("recordBody sends only set fields and keeps booleans", () => {
  assertEquals(recordBody(PROJECT, { name: "Deal", archived: false, summary: "", stage: "won" }), {
    name: "Deal",
    archived: false,
    stage: "won",
  });
});

Deno.test("writeRecord refuses an empty write before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(() => writeRecord(ctx, PERSON, "create", {}), Error, "Nothing to create");
  assertEquals(calls.length, 0);
});

Deno.test("required ids are enforced before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const { default: get } = await import("../../actions/person-get.ts");
  await assertRejects(
    () => Promise.resolve(get.execute({ id: " " }, ctx)),
    Error,
    "id is required",
  );
  assertEquals(calls.length, 0);
});
