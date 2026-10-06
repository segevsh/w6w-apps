import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  buildQuery,
  describeFailure,
  encodeId,
  HibobClient,
  HibobError,
} from "../../lib/client.ts";
import { toStringList } from "../../lib/params.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: buildQuery drops empty values and encodes", () => {
  assertEquals(buildQuery({ a: "x y", b: undefined, c: "", d: false }), "?a=x%20y&d=false");
  assertEquals(buildQuery({}), "");
});

Deno.test("client: encodeId escapes slashes", () => {
  assertEquals(encodeId(" a/b "), "a%2Fb");
});

Deno.test("client: errors carry status and both documented vendor shapes", async () => {
  const { ctx } = mockCtx([
    { status: 400, body: { key: "k", error: "Unknown field ID: /work/site", args: [] } },
    { status: 400, body: { error: "BAD_REQUEST", message: "Invalid input", statusCode: 400 } },
    { status: 401 },
  ]);
  const c = new HibobClient(ctx);
  const e1 = await assertRejects(() => c.get("/x"), HibobError);
  assert(e1.message.includes("Unknown field ID"), e1.message);
  assertEquals(e1.status, 400);
  const e2 = await assertRejects(() => c.get("/x"), HibobError);
  assert(e2.message.includes("Invalid input") && e2.message.includes("BAD_REQUEST"), e2.message);
  const e3 = await assertRejects(() => c.get("/x"), HibobError);
  assert(e3.message.includes("401"), e3.message);
});

Deno.test("client: an empty 2xx body gives status only; non-JSON text is kept", async () => {
  const { ctx } = mockCtx([{ status: 200 }, {
    body: "a,b",
    headers: { "content-type": "text/csv" },
  }]);
  const c = new HibobClient(ctx);
  assertEquals(await c.ack("PUT", "/x"), { status: 200 });
  assertEquals(await c.get("/y"), "a,b");
});

Deno.test("client: requests never carry an Authorization header (sign owns it)", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new HibobClient(ctx).post("/x", { a: 1 });
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("client: describeFailure distinguishes 403, 404 and 429", () => {
  assert(describeFailure(403, null, "GET /x").includes("permission"));
  assert(describeFailure(404, null, "GET /x").includes("module"));
  assert(describeFailure(429, null, "GET /x").includes("rate-limited"));
});

Deno.test("params: toStringList handles arrays, JSON strings, csv and blanks", () => {
  assertEquals(toStringList(["a", " b ", ""]), ["a", "b"]);
  assertEquals(toStringList('["a","b"]'), ["a", "b"]);
  assertEquals(toStringList("a, b,,c"), ["a", "b", "c"]);
  assertEquals(toStringList(undefined), []);
  assertEquals(toStringList(5), ["5"]);
});
