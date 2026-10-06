import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  compact,
  cursorOf,
  encodeId,
  errorText,
  jsonObject,
  LoopClient,
  LoopError,
  splitList,
} from "../../lib/client.ts";
import { mockCtx, queryOf } from "../_helpers.ts";

Deno.test("errorText: reads every error envelope Loop uses", () => {
  assertEquals(
    errorText({ error: { code: "401", http_code: "GEN-UNAUTHORIZED", message: "Unauthorized." } }),
    "GEN-UNAUTHORIZED: Unauthorized.",
  );
  assertEquals(errorText({ errors: "Unauthorized." }), "Unauthorized.");
  assertEquals(
    errorText({ errors: { message: "No return found with this ID." } }),
    "No return found with this ID.",
  );
  assertEquals(errorText({ errors: [{ message: "a" }, { message: "b" }] }), "a; b");
  assertEquals(
    errorText({
      message: "The given data was invalid.",
      errors: { line_item_id: ["is required"] },
    }),
    "The given data was invalid. (line_item_id: is required)",
  );
  assertEquals(
    errorText({ error: { message: "No return found with this ID." } }),
    "No return found with this ID.",
  );
});

Deno.test("errorText: success shapes are not errors", () => {
  assertEquals(errorText(true), null);
  assertEquals(errorText([{ id: 1 }]), null);
  assertEquals(errorText({ returns: [], nextPageUrl: null }), null);
  assertEquals(errorText({ id: 1, state: "open" }), null);
  assertEquals(errorText(null), null);
});

Deno.test("request: builds the URL, drops empty query values, sends JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: 1 } }]);
  const out = await new LoopClient(ctx).request("POST", "/x", {
    query: { a: "1", b: undefined, c: "", d: false },
    body: { z: 1 },
  });
  assertEquals(out, { ok: 1 });
  assertEquals(queryOf(calls[0].url), { a: "1", d: "false" });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"z":1}');
});

Deno.test("request: a non-JSON 200 is a failure, a 204 is null", async () => {
  const a = mockCtx([{ body: "<html>shell</html>" }]);
  const err = await assertRejects(() => new LoopClient(a.ctx).get("/x")) as LoopError;
  assert(err.message.includes("non-JSON"));
  const b = mockCtx([{ status: 204 }]);
  assertEquals(await new LoopClient(b.ctx).delete("/x"), null);
});

Deno.test("request: a non-2xx keeps status and parsed body on the error", async () => {
  const { ctx } = mockCtx([{ status: 422, body: false }]);
  const err = await assertRejects(() => new LoopClient(ctx).get("/x")) as LoopError;
  assertEquals(err.status, 422);
  assertEquals(err.body, false);
});

Deno.test("helpers: cursorOf, encodeId, compact, splitList, jsonObject", () => {
  assertEquals(cursorOf("https://api.loopreturns.com/api/v1/x?cursor=abc&n=1"), "abc");
  assertEquals(cursorOf(null), null);
  assertEquals(cursorOf("not a url"), null);
  assertEquals(encodeId(" a/b "), "a%2Fb");
  assertEquals(compact({ a: 1, b: undefined, c: "" }), { a: 1 });
  assertEquals(splitList("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(splitList(" "), undefined);
  assertEquals(jsonObject("x", '{"a":1}'), { a: 1 });
  assertEquals(jsonObject("x", { a: 1 }), { a: 1 });
  for (const bad of ["nope", "[1]", 5]) {
    try {
      jsonObject("x", bad);
      throw new Error("should have thrown");
    } catch (e) {
      assert((e as Error).message.startsWith("x "), String(bad));
    }
  }
});

Deno.test("request: a 2xx {message} acknowledgement is not an error; a 4xx one is", async () => {
  const ok = mockCtx([{ status: 202, body: { message: "Label requested", returnId: 1 } }]);
  assertEquals(await new LoopClient(ok.ctx).post("/x"), {
    message: "Label requested",
    returnId: 1,
  });
  const bad = mockCtx([{ status: 400, body: { message: "Bad thing" } }]);
  const err = await assertRejects(() => new LoopClient(bad.ctx).post("/x")) as LoopError;
  assert(err.message.includes("Bad thing"));
});
