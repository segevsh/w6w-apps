import { assertEquals, assertRejects } from "@std/assert";
import {
  buildQuery,
  errorText,
  seg,
  strList,
  TaskadeClient,
  vendorError,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: seg, strList and buildQuery", () => {
  assertEquals(seg("a/b c"), "a%2Fb%20c");
  assertEquals(strList(" a, b ,,c"), ["a", "b", "c"]);
  assertEquals(strList(["x", " y "]), ["x", "y"]);
  assertEquals(strList(undefined), []);
  assertEquals(buildQuery({ a: 1, b: "", c: undefined, d: "x y" }), "?a=1&d=x+y");
  assertEquals(buildQuery({}), "");
});

Deno.test("client: vendorError needs ok:false and a string code", () => {
  assertEquals(vendorError({ ok: false, code: "UNAUTHORIZED" })?.code, "UNAUTHORIZED");
  assertEquals(vendorError({ ok: true, items: [] }), undefined);
  assertEquals(vendorError({ ok: false }), undefined);
  assertEquals(errorText({ ok: false, code: "X", message: "m" }), "X: m");
  assertEquals(errorText("nope", " raw text "), "raw text");
});

Deno.test("client: an ok:false envelope on a 200 still throws", async () => {
  const { ctx } = mockCtx([{ body: { ok: false, code: "FORBIDDEN", message: "no" } }]);
  await assertRejects(
    async () => await new TaskadeClient(ctx).request("GET", "/workspaces"),
    Error,
    "FORBIDDEN: no",
  );
});

Deno.test("client: 429 mentions the reset header and a bodyless 2xx is {}", async () => {
  const { ctx } = mockCtx([
    { status: 429, headers: { "x-rate-limit-reset": "12.5" }, body: "slow down" },
    { status: 204 },
  ]);
  const client = new TaskadeClient(ctx);
  await assertRejects(async () => await client.request("GET", "/x"), Error, "resets in 12.5s");
  assertEquals(await client.request("DELETE", "/x"), {});
});
