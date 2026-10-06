import { assert, assertEquals } from "@std/assert";
import {
  compact,
  conversationId,
  DixaClient,
  encodeId,
  formatDixaError,
  nextPageKey,
  toList,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: compact drops unset values but keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0 }), { d: false, e: 0 });
});

Deno.test("client: toList splits and trims", () => {
  assertEquals(toList(" a, b ,,c"), ["a", "b", "c"]);
  assertEquals(toList(["x", " y "]), ["x", "y"]);
  assertEquals(toList(""), undefined);
  assertEquals(toList(undefined), undefined);
});

Deno.test("client: ids are validated and path-escaped", () => {
  assertEquals(conversationId(" 42 "), "42");
  for (const bad of ["", "4a", "-1", "1/2", undefined]) {
    let threw = false;
    try {
      conversationId(bad);
    } catch {
      threw = true;
    }
    assert(threw, `accepted ${bad}`);
  }
  assertEquals(encodeId("a/b?c"), "a%2Fb%3Fc");
});

Deno.test("client: nextPageKey reads the opaque key out of the relative next link", () => {
  assertEquals(nextPageKey({ next: "/v1/agents?pageKey=cGFn%3D%3D&pageLimit=2" }), "cGFn==");
  assertEquals(nextPageKey({ next: "" }), undefined);
  assertEquals(nextPageKey({}), undefined);
  assertEquals(nextPageKey(undefined), undefined);
});

Deno.test("client: formatDixaError uses the message and hints at the 401 ambiguity", () => {
  assert(
    formatDixaError(401, "GET", "/v1/agents", '{"message":"Unauthorized"}').includes(
      "Unauthorized",
    ),
  );
  assert(formatDixaError(401, "GET", "/v1/agents", "{}").includes("missing token"));
  assert(formatDixaError(500, "GET", "/v1/x", "oops").includes("oops"));
});

Deno.test("client: json sends accept, skips unset query values and tolerates an empty 204", async () => {
  const m = mockCtx([{ status: 204 }]);
  const out = await new DixaClient(m.ctx).json("/x", { query: { a: "1", b: undefined, c: "" } });
  assertEquals(out, undefined);
  assertEquals(m.calls[0].url, "https://dev.dixa.io/v1/x?a=1");
  assertEquals(m.calls[0].headers.accept, "application/json");
  assertEquals(m.calls[0].body, null);
});
