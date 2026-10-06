import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockConnection, mockCtx } from "../_helpers.ts";
import {
  camelKeys,
  parseError,
  qs,
  seg,
  ses,
  templateData,
  toJson,
  toList,
} from "../../lib/api.ts";
import { hostFromConnection, regionFromConnection } from "../../lib/connection.ts";
import { isKnownRegion, SES_NETWORK_ALLOW, SES_REGIONS, sesHost } from "../../lib/regions.ts";
import manifest from "../../package.json" with { type: "json" };

Deno.test("seg: encodes @ + / and ARN colons, leaves unreserved characters", () => {
  assertEquals(seg("a+b@x.com"), "a%2Bb%40x.com");
  assertEquals(
    seg("arn:aws:ses:us-east-1:1:identity/x"),
    "arn%3Aaws%3Ases%3Aus-east-1%3A1%3Aidentity%2Fx",
  );
  assertEquals(seg("it's (1)!"), "it%27s%20%281%29%21");
});

Deno.test("qs: skips unset values, repeats array keys, encodes", () => {
  assertEquals(qs({}), "");
  assertEquals(qs({ a: undefined, b: "" }), "");
  assertEquals(qs({ PageSize: 0 }), "?PageSize=0");
  assertEquals(qs({ k: ["x", "y z"] }), "?k=x&k=y%20z");
});

Deno.test("toList: splits on comma, semicolon and newline; empty is undefined", () => {
  assertEquals(toList("a@x.com, b@x.com;c@x.com\nd@x.com"), [
    "a@x.com",
    "b@x.com",
    "c@x.com",
    "d@x.com",
  ]);
  assertEquals(toList(["a", " b "]), ["a", "b"]);
  assertEquals(toList(""), undefined);
  assertEquals(toList(" , "), undefined);
  assertEquals(toList(undefined), undefined);
});

Deno.test("toJson / templateData: object, string and empty inputs", () => {
  assertEquals(toJson('{"a":1}', "x"), { a: 1 });
  assertEquals(toJson({ a: 1 }, "x"), { a: 1 });
  assertEquals(toJson("", "x"), undefined);
  assertThrows(() => toJson("{", "Thing"), Error, "Thing is not valid JSON");
  assertEquals(templateData({ a: 1 }), '{"a":1}');
  assertEquals(templateData('{"a":1}'), '{"a":1}');
  assertEquals(templateData(undefined), undefined);
});

Deno.test("camelKeys: lowercases the first letter recursively", () => {
  assertEquals(camelKeys({ A: { BcD: [{ Ef: 1 }] }, g: 2 }), { a: { bcD: [{ ef: 1 }] }, g: 2 });
});

Deno.test("parseError: header type (suffix stripped), body message, and fallbacks", () => {
  const mk = (h: Record<string, string>) => new Response("", { headers: h });
  assertEquals(
    parseError(mk({ "x-amzn-errortype": "NotFoundException:http://x/" }), '{"message":"gone"}'),
    { type: "NotFoundException", message: "gone" },
  );
  assertEquals(parseError(mk({}), '{"__type":"com.x#TooManyRequestsException","Message":"slow"}'), {
    type: "TooManyRequestsException",
    message: "slow",
  });
  assertEquals(parseError(mk({}), "plain text"), { type: undefined, message: "plain text" });
});

Deno.test("ses: an empty 200 body resolves to {} and a non-JSON 200 throws", async () => {
  const a = mockCtx([{ status: 200, body: "", headers: {} }]);
  assertEquals(await ses(a.ctx, { op: "X", path: "/p" }), {});
  const b = mockCtx([{ status: 200, body: "<html>", headers: {} }]);
  await assertRejects(() => ses(b.ctx, { op: "X", path: "/p" }), Error, "non-JSON body");
});

Deno.test("ses: sends no Authorization header (only `sign` may) and a JSON content-type with a body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await ses(ctx, { op: "X", path: "/p" });
  await ses(ctx, { op: "X", path: "/p", method: "POST", body: { a: 1 } });
  assertEquals(calls[0].headers, {});
  assertEquals(calls[1].headers, { "content-type": "application/json" });
  assertEquals(calls[1].body, '{"a":1}');
});

Deno.test("connection: region and host come from display; missing region is an error", () => {
  assertEquals(regionFromConnection(mockConnection({ region: "ap-south-1" })), "ap-south-1");
  assertEquals(
    hostFromConnection(mockConnection({ region: "ap-south-1" })),
    "email.ap-south-1.amazonaws.com",
  );
  assertThrows(() => regionFromConnection(mockConnection({})), Error, "no region");
  assertThrows(() => regionFromConnection(undefined), Error, "no region");
  assertThrows(
    () => hostFromConnection(mockConnection({ region: "mars-1" })),
    Error,
    "Unknown AWS region",
  );
});

Deno.test("regions: sesHost shape, and the manifest allowlist is exactly the 29 regional hosts", () => {
  assertEquals(sesHost("us-east-1"), "email.us-east-1.amazonaws.com");
  assertEquals(isKnownRegion("us-east-1"), true);
  assertEquals(isKnownRegion("cn-north-1"), false);
  assertEquals(SES_REGIONS.length, 29);
  assertEquals(new Set(SES_REGIONS).size, 29);
  assertEquals([...manifest.w6w.network.allow].sort(), [...SES_NETWORK_ALLOW].sort());
});
