import { assert, assertEquals } from "@std/assert";
import {
  buildQuery,
  compact,
  encodeId,
  errorText,
  HospitableClient,
  jsonValue,
  listValue,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("buildQuery: arrays bracket, include joins, empties drop", () => {
  assertEquals(
    decodeURIComponent(
      buildQuery({ properties: ["a", "b"], include: ["x", "y"], n: 0, e: "", u: undefined, z: [] }),
    ),
    "?properties[]=a&properties[]=b&include=x,y&n=0",
  );
  assertEquals(buildQuery(undefined), "");
  assertEquals(buildQuery({ a: undefined }), "");
});

Deno.test("helpers: encodeId, jsonValue, listValue, compact", () => {
  assertEquals(encodeId("a/b c"), "a%2Fb%20c");
  assertEquals(jsonValue('{"a":1}'), { a: 1 });
  assertEquals(jsonValue("not json"), "not json");
  assertEquals(jsonValue("  "), undefined);
  assertEquals(listValue("a, b\nc"), ["a", "b", "c"]);
  assertEquals(listValue(""), undefined);
  assertEquals(listValue([" x ", ""]), ["x"]);
  assertEquals(compact({ a: 1, b: undefined, c: "", d: false, e: 0 }), { a: 1, d: false, e: 0 });
});

Deno.test("errorText: message plus the errors map", () => {
  assertEquals(errorText({ message: "bad", errors: { f: ["one", "two"] } }), "bad (f: one two)");
  assertEquals(errorText({ message: "bad" }), "bad");
  assertEquals(errorText({ error: "e" }), "e");
  assertEquals(errorText("x"), undefined);
});

Deno.test("client.request: sends JSON bodies, throws with status and detail, tolerates empty bodies", async () => {
  const { ctx, calls } = mockCtx([
    { body: { data: 1 } },
    { status: 204 },
    { status: 422, body: { message: "invalid", errors: { a: ["no"] } } },
  ]);
  const client = new HospitableClient(ctx);
  assertEquals(await client.request("POST", "/x", { body: { a: 1 } }), { data: 1 });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"a":1}');
  assertEquals(await client.request("DELETE", "/x"), { status: 204 });
  assertEquals(calls[1].body, null);
  let message = "";
  try {
    await client.request("GET", "/x");
  } catch (e) {
    message = (e as Error).message;
  }
  assert(
    message.includes("GET /x") && message.includes("422") && message.includes("invalid (a: no)"),
    message,
  );
});
