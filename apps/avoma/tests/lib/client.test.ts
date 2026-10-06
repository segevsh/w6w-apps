import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  assertApiUrl,
  AvomaClient,
  csv,
  errorText,
  queryString,
  toList,
  toPage,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("queryString: skips unset values, keeps false and 0, repeats array keys", () => {
  assertEquals(
    queryString({ a: undefined, b: "", c: false, d: 0, e: ["x", "y"] }),
    "?c=false&d=0&e=x&e=y",
  );
  assertEquals(queryString({}), "");
});

Deno.test("toList / csv: trim, drop blanks, accept string or array", () => {
  assertEquals(toList(" a, b ,,c"), ["a", "b", "c"]);
  assertEquals(toList([]), undefined);
  assertEquals(csv(["a", "b"]), "a,b");
  assertEquals(csv(undefined), undefined);
});

Deno.test("errorText: reads detail, message or error", () => {
  assertEquals(errorText({ detail: "d" }), "d");
  assertEquals(errorText({ message: "m" }), "m");
  assertEquals(errorText({ error: "e" }), "e");
  assertEquals(errorText({}), undefined);
  assertEquals(errorText(null), undefined);
});

Deno.test("toPage: array, envelope and null all normalise", () => {
  assertEquals(toPage([1, 2]), { results: [1, 2], count: 2, next: null, previous: null });
  assertEquals(toPage({ count: 5, next: "n", previous: "p", results: [1] }), {
    results: [1],
    count: 5,
    next: "n",
    previous: "p",
  });
  assertEquals(toPage(null), { results: [], count: 0, next: null, previous: null });
});

Deno.test("assertApiUrl: only the API origin under /v1/", () => {
  assert(
    assertApiUrl("https://api.avoma.com/v1/meetings/?page=2").startsWith(
      "https://api.avoma.com/v1/",
    ),
  );
  assertThrows(() => assertApiUrl("https://api.avoma.com.evil.test/v1/x/"), Error, "refusing");
  assertThrows(() => assertApiUrl("http://api.avoma.com/v1/x/"), Error, "refusing");
  assertThrows(() => assertApiUrl("https://api.avoma.com/other/"), Error, "refusing");
  assertThrows(() => assertApiUrl("not a url"), Error, "valid URL");
});

Deno.test("client: a non-JSON success body is an error; a non-JSON failure shows the text", async () => {
  const ok = mockCtx([{ status: 200, body: "<html>", headers: { "content-type": "text/html" } }]);
  await assertRejects(
    async () => await new AvomaClient(ok.ctx).get("/v1/users/"),
    Error,
    "not JSON",
  );
  const bad = mockCtx([{
    status: 500,
    body: "Server Error",
    headers: { "content-type": "text/html" },
  }]);
  await assertRejects(
    async () => await new AvomaClient(bad.ctx).get("/v1/users/"),
    Error,
    "500: Server Error",
  );
});

Deno.test("client: requests carry no authorization header (sign owns it) and accept JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new AvomaClient(ctx).get("/v1/users/");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["accept"], "application/json");
});
