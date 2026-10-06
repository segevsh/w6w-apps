import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { compact, csv, formatError, seg, TimelinesClient, toList } from "../../lib/client.ts";

Deno.test("seg: encodes, trims and refuses empty", () => {
  assertEquals(seg(" a/b "), "a%2Fb");
  assertEquals(seg(12), "12");
  assertThrows(() => seg(""), Error, "empty");
  assertThrows(() => seg(undefined), Error, "empty");
});

Deno.test("toList / csv: split on commas and newlines", () => {
  assertEquals(toList("a, b\nc,,"), ["a", "b", "c"]);
  assertEquals(toList(["x", " y "]), ["x", "y"]);
  assertEquals(toList(undefined), []);
  assertEquals(csv("a,b"), "a,b");
  assertEquals(csv(""), undefined);
});

Deno.test("compact: drops unset, keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0 }), { d: false, e: 0 });
});

Deno.test("formatError: carries the stable code and per-field diagnostics", () => {
  const msg = formatError(400, {
    status: "error",
    message: "bad",
    error_code: "validation_error",
    errors: [{ fields: ["body", "phone"], msg: "required" }],
  });
  assertEquals(msg, "HTTP 400 (validation_error): bad; body.phone: required");
  assertEquals(formatError(502, undefined), "HTTP 502");
});

Deno.test("client: a 200 whose body says status error is a failure", async () => {
  const { ctx } = mockCtx([{
    body: { status: "error", message: "nope", error_code: "not_found" },
  }]);
  const err = await assertRejects(() => new TimelinesClient(ctx).get("/chats/1"), Error);
  assert(err.message.includes("not_found"), err.message);
});

Deno.test("client: a non-JSON error page still throws with the status", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "<html>", headers: {} }]);
  const err = await assertRejects(() => new TimelinesClient(ctx).get("/chats"), Error);
  assert(err.message.includes("502"), err.message);
});

Deno.test("client: sends JSON accept, never an authorization header, and skips unset query", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "ok" } }]);
  await new TimelinesClient(ctx).get("/chats", { page: 1, label: undefined, closed: false });
  assertEquals(calls[0].url, "https://app.timelines.ai/integrations/api/chats?page=1&closed=false");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: an empty 2xx body reads as ok", async () => {
  const { ctx } = mockCtx([{ status: 200 }]);
  assertEquals(await new TimelinesClient(ctx).delete("/files/x"), { status: "ok" });
});
