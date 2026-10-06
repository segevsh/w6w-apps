import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  buildQuery,
  compact,
  errorText,
  jsonValue,
  LeexiClient,
  nested,
  seg,
  strList,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("buildQuery: arrays use Rails-style repeated key[] parameters", () => {
  assertEquals(
    decodeURIComponent(buildQuery({ source_id: ["a", "b"], page: 2 })),
    "?source_id[]=a&source_id[]=b&page=2",
  );
  assertEquals(buildQuery({ a: undefined, b: null, c: "", d: [] }), "");
  assertEquals(buildQuery({ flag: false }), "?flag=false");
});

Deno.test("seg / strList / jsonValue / compact / nested helpers", () => {
  assertEquals(seg("a/b"), "a%2Fb");
  assertEquals(strList("a, b,,c"), ["a", "b", "c"]);
  assertEquals(strList([]), undefined);
  assertEquals(strList(undefined), undefined);
  assertEquals(jsonValue('{"a":1}'), { a: 1 });
  assertEquals(jsonValue("not json"), "not json");
  assertEquals(jsonValue("  "), undefined);
  assertEquals(compact({ a: 1, b: undefined, c: null }), { a: 1, c: null });
  assertEquals(nested({ a: undefined }), undefined);
  assertEquals(nested({ a: 1, b: undefined }), { a: 1 });
});

Deno.test("errorText: reads message/error, ignores HTML shells", () => {
  assertEquals(errorText({ message: "bad" }, ""), "bad");
  assertEquals(errorText({ error: "nope" }, ""), "nope");
  assertEquals(errorText({ errors: { name: ["taken"] } }, ""), '{"name":["taken"]}');
  assertEquals(errorText(undefined, "<html>x</html>"), "");
  assertEquals(errorText(undefined, "plain failure"), "plain failure");
});

Deno.test("request: JSON body gets a content-type, a non-JSON success body becomes {}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "ok-not-json" }]);
  const out = await new LeexiClient(ctx).request("POST", "/teams", { body: { name: "x" } });
  assertEquals(out, {});
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers.accept, "application/json");
});

Deno.test("request: documented statuses carry their meaning", async () => {
  for (
    const [status, text] of [[402, "subscription"], [403, "permission scope"], [
      429,
      "50 requests/minute",
    ]] as const
  ) {
    const { ctx } = mockCtx([{ status }]);
    const err = await assertRejects(() => new LeexiClient(ctx).request("GET", "/users"));
    assert((err as Error).message.includes(text), `${status}: ${(err as Error).message}`);
  }
});
