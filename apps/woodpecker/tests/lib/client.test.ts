import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  buildUrl,
  call,
  csv,
  encodeId,
  errorMessage,
  listOf,
  parseJsonField,
  pick,
  requireArray,
  V1,
  V2,
  WoodpeckerError,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: errorMessage reads the v1 and v2 dialects", () => {
  assertEquals(errorMessage({ status: { status: "ERROR", code: "E_SESSION", msg: "bad key" } }), {
    code: "E_SESSION",
    message: "bad key",
  });
  assertEquals(errorMessage({ title: "Unauthorized", status: 401, detail: "Invalid api key" }), {
    code: "Unauthorized",
    message: "Invalid api key",
  });
  assertEquals(errorMessage({ code: "CAMPAIGN_NOT_EXIST", message: "Campaign not found" }), {
    code: "CAMPAIGN_NOT_EXIST",
    message: "Campaign not found",
  });
  assertEquals(errorMessage(null), {});
});

Deno.test("client: buildUrl drops unset query values", () => {
  assertEquals(
    buildUrl(V2, "/x", { a: 1, b: undefined, c: "", d: null, e: false }),
    "https://api.woodpecker.co/rest/v2/x?a=1&e=false",
  );
});

Deno.test("client: encodeId trims, encodes and refuses empty", () => {
  assertEquals(encodeId(" a/b "), "a%2Fb");
  assertEquals(encodeId(12), "12");
  assertThrows(() => encodeId(""), Error, "ID was empty");
});

Deno.test("client: pick, csv, parseJsonField and requireArray", () => {
  assertEquals(pick({ a: 1, b: "", c: null, d: false }, ["a", "b", "c", "d"]), { a: 1, d: false });
  assertEquals(csv(["1", "2"]), "1,2");
  assertEquals(csv([]), undefined);
  assertEquals(csv("3,4"), "3,4");
  assertEquals(parseJsonField("x", "[1]"), [1]);
  assertEquals(parseJsonField("x", [1]), [1]);
  assertEquals(requireArray("x", "[1,2]"), [1, 2]);
  assertEquals(requireArray("x", [1], 1), [1]);
});

Deno.test("client: parse failures are named", () => {
  let message = "";
  try {
    parseJsonField("prospects", "{nope");
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "prospects must be valid JSON");
  for (const bad of [[], "[]", "{}"]) {
    let err = "";
    try {
      requireArray("x", bad);
    } catch (e) {
      err = (e as Error).message;
    }
    assert(err.includes("non-empty JSON array"));
  }
});

Deno.test("client: listOf unwraps arrays and the empty-match message", () => {
  assertEquals(listOf([{ id: 1 }]).items, [{ id: 1 }]);
  assertEquals(listOf([{ prospect: { id: 2 } }]).items, [{ id: 2 }]);
  assertEquals(listOf({ message: "none" }), { items: [], message: "none" });
  assertEquals(listOf(null), { items: [] });
});

Deno.test("client: call returns {} for an empty body and sends JSON", async () => {
  const m = mockCtx([{ status: 200, body: undefined }]);
  assertEquals(await call(m.ctx, "POST", V2, "/x", { body: { a: 1 } }), {});
  assertEquals(m.calls[0].headers["content-type"], "application/json");
  assertEquals(m.calls[0].body, '{"a":1}');
});

Deno.test("client: HTTP errors and 200-with-ERROR bodies both throw WoodpeckerError", async () => {
  const http = mockCtx([{
    status: 404,
    body: { title: "Not Found", detail: "Requested resource does not exist" },
  }]);
  const e1 = await assertRejects(
    () => call(http.ctx, "GET", V2, "/x"),
    WoodpeckerError,
    "Requested resource",
  );
  assertEquals((e1 as WoodpeckerError).status, 404);
  const inBody = mockCtx([{
    status: 200,
    body: { status: { status: "ERROR", code: "E_X", msg: "m" } },
  }]);
  const e2 = await assertRejects(() => call(inBody.ctx, "POST", V1, "/x"), WoodpeckerError, "E_X");
  assertEquals((e2 as WoodpeckerError).vendorCode, "E_X");
});

Deno.test("client: a non-JSON body does not crash the error path", async () => {
  const m = mockCtx([{
    status: 502,
    body: "<html>bad gateway</html>",
    headers: { "content-type": "text/html" },
  }]);
  await assertRejects(() => call(m.ctx, "GET", V2, "/x"), WoodpeckerError, "502");
});
