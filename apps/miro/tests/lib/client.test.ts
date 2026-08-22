import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { API_URL, compact, csv, geometry, json, MiroClient, position } from "../../lib/client.ts";

Deno.test("compact: drops unset keys, empty arrays and empty objects", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0, g: [], h: {} }), {
    a: 1,
    e: false,
    f: 0,
  });
});

Deno.test("csv: takes a comma string or a live array", () => {
  assertEquals(csv("a@b.com, c@d.com"), ["a@b.com", "c@d.com"]);
  assertEquals(csv(["a@b.com"]), ["a@b.com"]);
  assertEquals(csv(""), undefined);
});

Deno.test("json: parses a string param and names a bad one", () => {
  assertEquals(json('{"a":1}', "style"), { a: 1 });
  assertEquals(json("", "style"), undefined);
  const err = assertThrows(() => json("{oops", "policy"), Error);
  assert(err.message.includes("policy"), err.message);
});

/** Both blank means "let Miro place it", not "put it at the origin". */
Deno.test("position: is omitted entirely when neither coordinate is set", () => {
  assertEquals(position(undefined, undefined), undefined);
  assertEquals(position(10, 20), { x: 10, y: 20 });
  assertEquals(position(10, undefined), { x: 10, y: 0 });
  assertEquals(position(0, 0), { x: 0, y: 0 });
});

Deno.test("geometry: includes only the dimensions that were set", () => {
  assertEquals(geometry(undefined, undefined), undefined);
  assertEquals(geometry(100, undefined), { width: 100 });
  assertEquals(geometry(100, 50), { width: 100, height: 50 });
  assertEquals(geometry(100, undefined, 45), { width: 100, rotation: 45 });
});

Deno.test("client: never sends an Authorization header — signing is the host's job", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display: {} });
  await new MiroClient(ctx).request("/v2/boards");
  assertEquals(calls[0].url, `${API_URL}/v2/boards`);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["accept"], "application/json");
});

Deno.test("client: a bare array body is sent as-is, for the bulk endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: [] } }], { display: {} });
  await new MiroClient(ctx).request("/v2/boards/b1/items/bulk", {
    method: "POST",
    body: [{ type: "sticky_note" }],
  });
  assertEquals(JSON.parse(calls[0].body!), [{ type: "sticky_note" }]);
});

Deno.test("client: a failure surfaces the status and Miro's own error body", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { status: 400, code: "invalidParameters", message: "width and height", type: "error" },
  }], { display: {} });
  const err = await assertRejects(
    async () => await new MiroClient(ctx).request("/v2/boards/b1/sticky_notes"),
    Error,
  );
  assert(err.message.includes("400"), err.message);
  assert(err.message.includes("invalidParameters"), err.message);
});

Deno.test("client: 204 comes back as undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }], { display: {} });
  assertEquals(
    await new MiroClient(ctx).request("/v2/boards/b1", { method: "DELETE" }),
    undefined,
  );
});

/**
 * Miro has two pagination contracts and they are not interchangeable — the
 * board-item collections use a cursor, the board list uses an offset.
 */
Deno.test("client: the cursor pager follows `cursor` until it is absent", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: [{ id: "i1" }], cursor: "c2" } },
    { status: 200, body: { data: [{ id: "i2" }] } },
  ], { display: {} });
  const items = await new MiroClient(ctx).requestAllCursor("/v2/boards/b1/items");
  assertEquals(items, [{ id: "i1" }, { id: "i2" }]);
  assertEquals(new URL(calls[0].url).searchParams.get("cursor"), null);
  assertEquals(new URL(calls[1].url).searchParams.get("cursor"), "c2");
});

Deno.test("client: the offset pager advances `offset` and stops at `total`", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: [{ id: "b1" }, { id: "b2" }], total: 3, size: 2 } },
    { status: 200, body: { data: [{ id: "b3" }], total: 3, size: 1 } },
  ], { display: {} });
  const items = await new MiroClient(ctx).requestAllOffset("/v2/boards");
  assertEquals(items.length, 3);
  assertEquals(new URL(calls[0].url).searchParams.get("offset"), "0");
  assertEquals(new URL(calls[1].url).searchParams.get("offset"), "2");
  // `total` reached — no third call.
  assertEquals(calls.length, 2);
});

Deno.test("client: an empty page ends either pager rather than spinning", async () => {
  const cur = mockCtx([{ status: 200, body: { data: [], cursor: "c2" } }], { display: {} });
  assertEquals(await new MiroClient(cur.ctx).requestAllCursor("/v2/boards/b1/items"), []);
  assertEquals(cur.calls.length, 1);

  const off = mockCtx([{ status: 200, body: { data: [], total: 99 } }], { display: {} });
  assertEquals(await new MiroClient(off.ctx).requestAllOffset("/v2/boards"), []);
  assertEquals(off.calls.length, 1);
});

Deno.test("client: both pagers stop at wantTotal", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: [{ id: "1" }, { id: "2" }, { id: "3" }], cursor: "c2" } },
  ], { display: {} });
  assertEquals(await new MiroClient(ctx).requestAllCursor("/v2/boards/b1/items", {}, 2), [
    { id: "1" },
    { id: "2" },
  ]);
  assertEquals(calls.length, 1);
});
