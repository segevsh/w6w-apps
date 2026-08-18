import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  compact,
  csv,
  DeelClient,
  json,
  PRODUCTION,
  resolveBase,
  SANDBOX,
} from "../../lib/client.ts";

const display = {};

Deno.test("resolveBase: production by default, sandbox when the connection says so", () => {
  assertEquals(resolveBase(undefined), PRODUCTION);
  assertEquals(resolveBase({ display: {} } as never), PRODUCTION);
  assertEquals(resolveBase({ display: { environment: "sandbox" } } as never), SANDBOX);
});

Deno.test("client: builds URLs against the connection's environment", async () => {
  const prod = mockCtx([{ status: 200, body: {} }], { display: {} });
  await new DeelClient(prod.ctx).request("/contracts");
  assertEquals(prod.calls[0].url, `${PRODUCTION}/contracts`);

  const sandbox = mockCtx([{ status: 200, body: {} }], { display: { environment: "sandbox" } });
  await new DeelClient(sandbox.ctx).request("/contracts");
  assertEquals(sandbox.calls[0].url, `${SANDBOX}/contracts`);
});

Deno.test("compact / csv / json behave as the actions expect", () => {
  assertEquals(compact({ a: 1, b: undefined, c: "", d: false, e: [] }), { a: 1, d: false });
  assertEquals(csv("a, b"), ["a", "b"]);
  assertEquals(csv([]), undefined);
  assertEquals(json('{"a":1}', "dates"), { a: 1 });
  const bad = assertThrows(() => json("{oops", "dates"), Error);
  assert(bad.message.includes("dates"), bad.message);
});

Deno.test("client: never sends an Authorization header — signing is the host's job", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await new DeelClient(ctx).request("/contracts");
  // Several Deel operations declare Authorization as a parameter; copying that
  // into an action would put a credential in a form field.
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["accept"], "application/json");
});

Deno.test("client: array query values repeat the key, and blanks are dropped", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await new DeelClient(ctx).request("/contracts", {
    query: { statuses: ["new", "in_progress"], team_id: "" },
  });
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.getAll("statuses"), ["new", "in_progress"]);
  assertEquals(q.get("team_id"), null);
});

Deno.test("client: a failure surfaces the status and Deel's own error body", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { request: { status: 401 }, errors: [{ message: "Unauthorized call" }] },
  }], { display });
  const err = await assertRejects(
    async () => await new DeelClient(ctx).request("/contracts"),
    Error,
  );
  assert(err.message.includes("401"), err.message);
  assert(err.message.includes("Unauthorized call"), err.message);
});

/**
 * Deel has two pagination contracts and they are not interchangeable — sending
 * a cursor to an offset endpoint returns page one forever.
 */
Deno.test("client: the cursor pager follows page.cursor as after_cursor", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: [{ id: 1 }], page: { cursor: "c2" } } },
    { status: 200, body: { data: [{ id: 2 }], page: {} } },
  ], { display });
  const items = await new DeelClient(ctx).requestAllCursor("/contracts");
  assertEquals(items, [{ id: 1 }, { id: 2 }]);
  assertEquals(new URL(calls[0].url).searchParams.get("after_cursor"), null);
  assertEquals(new URL(calls[1].url).searchParams.get("after_cursor"), "c2");
});

Deno.test("client: the offset pager advances offset and stops at total_rows", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: [{ id: 1 }, { id: 2 }], page: { total_rows: 3 } } },
    { status: 200, body: { data: [{ id: 3 }], page: { total_rows: 3 } } },
  ], { display });
  const items = await new DeelClient(ctx).requestAllOffset("/people");
  assertEquals(items.length, 3);
  assertEquals(new URL(calls[0].url).searchParams.get("offset"), "0");
  assertEquals(new URL(calls[1].url).searchParams.get("offset"), "2");
  // total_rows reached — no third call.
  assertEquals(calls.length, 2);
  // And never a cursor on an offset endpoint.
  assertEquals(new URL(calls[0].url).searchParams.get("after_cursor"), null);
});

Deno.test("client: an empty page ends either pager rather than spinning", async () => {
  const cur = mockCtx([{ status: 200, body: { data: [], page: { cursor: "c" } } }], { display });
  assertEquals(await new DeelClient(cur.ctx).requestAllCursor("/contracts"), []);
  assertEquals(cur.calls.length, 1);

  const off = mockCtx([{ status: 200, body: { data: [], page: { total_rows: 99 } } }], { display });
  assertEquals(await new DeelClient(off.ctx).requestAllOffset("/people"), []);
  assertEquals(off.calls.length, 1);
});

Deno.test("client: both pagers stop at wantTotal", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: [{ id: 1 }, { id: 2 }, { id: 3 }], page: { cursor: "c" } } },
  ], { display });
  assertEquals(await new DeelClient(ctx).requestAllCursor("/contracts", {}, 2), [
    { id: 1 },
    { id: 2 },
  ]);
  assertEquals(calls.length, 1);
});
