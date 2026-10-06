import { assertEquals } from "@std/assert";
import {
  compact,
  formatSkyvernError,
  list,
  parseJson,
  SkyvernClient,
  truncate,
} from "../lib/client.ts";
import { mockCtx } from "./_helpers.ts";

Deno.test("compact: drops undefined, null, empty string and empty arrays; keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: [], e: false, f: 0, g: "x" }), {
    e: false,
    f: 0,
    g: "x",
  });
});

Deno.test("list: splits, trims and drops blanks; empty becomes undefined", () => {
  assertEquals(list(" a, b ,,c"), ["a", "b", "c"]);
  assertEquals(list(["x", " y "]), ["x", "y"]);
  assertEquals(list(""), undefined);
  assertEquals(list(undefined), undefined);
  assertEquals(list(" , "), undefined);
});

Deno.test("parseJson: passes objects through, parses text, rejects garbage", () => {
  assertEquals(parseJson("x", { a: 1 }), { a: 1 });
  assertEquals(parseJson("x", "[1,2]"), [1, 2]);
  assertEquals(parseJson("x", ""), undefined);
  assertEquals(parseJson("x", undefined), undefined);
});

Deno.test("truncate: caps long text", () => {
  assertEquals(truncate("abc", 10), "abc");
  assertEquals(truncate("a".repeat(20), 5).startsWith("aaaaa…"), true);
});

Deno.test("formatSkyvernError: string detail, validation array, non-JSON and object detail", () => {
  assertEquals(
    formatSkyvernError(403, "GET", "/v1/x", '{"detail":"Could not validate credentials"}'),
    "Skyvern 403 for GET /v1/x: Could not validate credentials",
  );
  assertEquals(
    formatSkyvernError(
      422,
      "POST",
      "/v1/y",
      '{"detail":[{"loc":["body","url"],"msg":"bad url"},{"loc":["query","page"],"msg":"too small"}]}',
    ),
    "Skyvern 422 for POST /v1/y: url: bad url; page: too small",
  );
  assertEquals(
    formatSkyvernError(502, "GET", "/z", "<html>bad gateway</html>"),
    "Skyvern 502 for GET /z: <html>bad gateway</html>",
  );
  assertEquals(
    formatSkyvernError(409, "PATCH", "/s", '{"detail":{"code":"ended"}}'),
    'Skyvern 409 for PATCH /s: {"code":"ended"}',
  );
});

Deno.test("SkyvernClient: never sets an auth header itself and returns undefined on an empty body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const out = await new SkyvernClient(ctx).json("/v1/version");
  assertEquals(out, undefined);
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].headers.accept, "application/json");
});
