import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  asObject,
  bareCode,
  buildQuery,
  encodeId,
  interpret,
  jsonObject,
  maskSlack,
  SevenClient,
  toList,
  toParams,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: bareCode accepts only three-digit codes, as number or string", () => {
  assertEquals(bareCode("900"), "900");
  assertEquals(bareCode(" 900\n"), "900");
  assertEquals(bareCode(900), "900");
  assertEquals(bareCode(12.35), undefined);
  assertEquals(bareCode("290.67"), undefined);
  assertEquals(bareCode({ success: "100" }), undefined);
});

Deno.test("client: interpret throws on codes and success:false, passes success shapes", () => {
  assertThrows(() => interpret("900", "GET /x"), Error, "authentication failed");
  assertThrows(() => interpret({ success: "500" }, "POST /sms"), Error, "too little credit");
  assertThrows(
    () => interpret({ success: false, error: "Invalid request" }, "x"),
    Error,
    "Invalid",
  );
  assertThrows(
    () => interpret({ status: false, status_message: "refused" }, "x"),
    Error,
    "refused",
  );
  assertThrows(() => interpret({ code: "600" }, "x"), Error, "600");
  assertEquals(interpret({ success: "100", a: 1 }, "x"), { success: "100", a: 1 });
  assertEquals(interpret({ success: true, code: null, hooks: [] }, "x"), {
    success: true,
    code: null,
    hooks: [],
  });
  assertEquals(interpret({ success: true, code: 100, price: 0.005 }, "x"), {
    success: true,
    code: 100,
    price: 0.005,
  });
  assertEquals(interpret({ amount: 1, currency: "EUR" }, "x"), { amount: 1, currency: "EUR" });
  assertEquals(interpret({ success: "101" }, "x", ["100", "101"]), { success: "101" });
});

Deno.test("client: an unrecognised code is still thrown, named as unrecognised", () => {
  assertThrows(() => interpret("777", "x"), Error, "unrecognised return code");
});

Deno.test("client: toList / jsonObject / toParams / buildQuery shape input", () => {
  assertEquals(toList("a, b,,c"), ["a", "b", "c"]);
  assertEquals(toList(["a ", "b"]), ["a", "b"]);
  assertEquals(toList(undefined), []);
  assertEquals(jsonObject('{"a":1}'), { a: 1 });
  assertEquals(jsonObject(undefined), {});
  assertThrows(() => jsonObject("{bad"), Error, "not valid JSON");
  assertThrows(() => jsonObject("[1]"), Error, "must be an object");
  assertEquals(
    toParams({ a: true, b: false, c: 0, d: "", e: undefined, f: [1, 2], g: [] }).toString(),
    "a=1&b=0&c=0&f=1%2C2",
  );
  assertEquals(buildQuery({ country: "DE", x: undefined }), "?country=DE");
  assertEquals(buildQuery(undefined), "");
  assertEquals(encodeId(" a/b "), "a%2Fb");
});

Deno.test("client: asObject wraps arrays and scalars, passes objects", () => {
  assertEquals(asObject([1], "rows"), { rows: [1] });
  assertEquals(asObject({ a: 1 }, "rows"), { a: 1 });
  assertEquals(asObject("x", "rows"), { rows: "x" });
});

Deno.test("client: maskSlack hides the incoming-webhook URL and leaves other numbers alone", () => {
  const masked = maskSlack({
    forward_sms_mo: { slack: { uri: "https://hooks.slack.com/x", enabled: true } },
  });
  assertEquals(masked, { forward_sms_mo: { slack: { enabled: true, has_uri: true } } });
  assertEquals(maskSlack({ number: "1" }), { number: "1" });
});

Deno.test("client: Accept JSON on every call; the key is never set by the client", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: 1 } }]);
  await new SevenClient(ctx).request("GET", "/x");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(calls[0].url.includes("p="), false);
});

Deno.test("client: a non-2xx is thrown with its status; a non-JSON 200 body is thrown too", async () => {
  const bad = mockCtx([{ status: 502, body: "bad gateway", headers: {} }]);
  let message = "";
  try {
    await new SevenClient(bad.ctx).request("GET", "/x");
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("502") && message.includes("bad gateway"), message);

  const html = mockCtx([{ body: "<html>shell</html>", headers: { "content-type": "text/html" } }]);
  message = "";
  try {
    await new SevenClient(html.ctx).request("GET", "/x");
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("not JSON"), message);
});

Deno.test("client: an empty 200 body is an empty object", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "", headers: {} }]);
  assertEquals(await new SevenClient(ctx).request("DELETE", "/contacts/1"), {});
});
