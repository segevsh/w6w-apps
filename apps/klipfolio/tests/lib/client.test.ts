import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  buildQuery,
  createdResult,
  idFromLocation,
  jsonValue,
  KlipfolioClient,
  listResult,
  okResult,
  seg,
  strList,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: seg encodes, strList splits, jsonValue parses", () => {
  assertEquals(seg("a/b c"), "a%2Fb%20c");
  assertEquals(strList(" a, b ,,c"), ["a", "b", "c"]);
  assertEquals(strList(""), undefined);
  assertEquals(strList(["x"]), ["x"]);
  assertEquals(jsonValue('{"a":1}'), { a: 1 });
  assertEquals(jsonValue("nope"), "nope");
  assertEquals(jsonValue(" "), undefined);
});

Deno.test("client: buildQuery skips empty values and keeps false", () => {
  assertEquals(buildQuery({ a: "1", b: undefined, c: "", d: false, e: 0 }), "?a=1&d=false&e=0");
  assertEquals(buildQuery(undefined), "");
});

Deno.test("client: result helpers shape the envelope", () => {
  assertEquals(idFromLocation("/tabs/ab1"), "ab1");
  assertEquals(idFromLocation(undefined), undefined);
  assertEquals(createdResult({ meta: { location: "/klips/k9" }, data: {} }).id, "k9");
  assertEquals(okResult({ meta: { success: true }, data: { op_requested: "enable" } }), {
    success: true,
    op: "enable",
  });
  assertEquals(listResult({ meta: {}, data: { klips: [1, 2] } }), {
    items: [1, 2],
    count: 2,
    total: 2,
  });
  assertEquals(listResult({ meta: {}, data: {} }).items, []);
});

Deno.test("client: sends JSON bodies with content-type and parses the envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: { meta: { success: true }, data: { id: "1" } } }]);
  const env = await new KlipfolioClient(ctx).request("POST", "/klips", { body: { name: "n" } });
  assertEquals(env.data, { id: "1" });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers.accept, "application/json");
});

Deno.test("client: a non-JSON success body is returned as raw data", async () => {
  const { ctx } = mockCtx([{ body: "a,b\n1,2", headers: { "content-type": "text/csv" } }]);
  assertEquals((await new KlipfolioClient(ctx).request("GET", "/x")).data, "a,b\n1,2");
});

Deno.test("client: meta.success false on a 200 is still an error", async () => {
  const { ctx } = mockCtx([{
    body: { meta: { success: false, error_code: "nope", error_desc: "denied" } },
  }]);
  await assertRejects(() => new KlipfolioClient(ctx).request("GET", "/x"), Error, "denied (nope)");
});

Deno.test("client: a non-JSON error body is quoted and a 429 is reported", async () => {
  const { ctx } = mockCtx([{ status: 429, body: "slow down" }]);
  const err = await assertRejects(() => new KlipfolioClient(ctx).request("GET", "/x"), Error);
  assert(err.message.includes("HTTP 429") && err.message.includes("slow down"));
});
