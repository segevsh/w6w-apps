import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  asOptionalJson,
  compact,
  encodeId,
  formatMaintainXError,
  MaintainXClient,
  toIdList,
  toList,
} from "../../lib/client.ts";
import { errorBody, mockCtx, queryAll } from "../_helpers.ts";

Deno.test("client: array query values are repeated keys, not comma-joined", async () => {
  const { ctx, calls } = mockCtx([{ body: { workOrders: [], nextCursor: null } }]);
  await new MaintainXClient(ctx).list("/workorders", "workOrders", {
    statuses: ["OPEN", "DONE"],
    limit: 5,
    empty: "",
  });
  assertEquals(queryAll(calls[0].url), { statuses: ["OPEN", "DONE"], limit: ["5"] });
});

Deno.test("client: list keeps the vendor's array key and normalises nextCursor", async () => {
  const { ctx } = mockCtx([{ body: { teams: [{ id: 1 }], nextCursor: "c2", nextPageUrl: "u" } }]);
  assertEquals(await new MaintainXClient(ctx).list("/teams", "teams", {}), {
    teams: [{ id: 1 }],
    nextCursor: "c2",
  });
});

Deno.test("client: organizationId becomes x-organization-id only when set", async () => {
  const a = mockCtx([{ body: {} }, { body: {} }]);
  const c = new MaintainXClient(a.ctx);
  await c.request("/x", { organizationId: 7 });
  await c.request("/x");
  assertEquals(a.calls[0].headers["x-organization-id"], "7");
  assertEquals(a.calls[1].headers["x-organization-id"], undefined);
});

Deno.test("client: errors surface the vendor's error string and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("Work order not found") }]);
  const err = await assertRejects(() => new MaintainXClient(ctx).request("/workorders/9"), Error);
  assert(err.message.includes("404"));
  assert(err.message.includes("Work order not found"));
});

Deno.test("client: a 429 explains the batch endpoint", () => {
  assert(formatMaintainXError(429, "POST", "/v1/x", '{"error":"slow"}').includes("batch"));
});

Deno.test("client: 204 and empty bodies resolve undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await new MaintainXClient(ctx).request("/x", { method: "DELETE" }), undefined);
});

Deno.test("client: helpers", () => {
  assertEquals(compact({ a: 1, b: "", c: undefined, d: [], e: null, f: 0 }), { a: 1, f: 0 });
  assertEquals(encodeId("a/b"), "a%2Fb");
  assertEquals(toList("a, b,,c"), ["a", "b", "c"]);
  assertEquals(toList([1, 2]), ["1", "2"]);
  assertEquals(toIdList("1, 2", "x"), [1, 2]);
  assertEquals(toIdList("", "x"), undefined);
  assert(() => toIdList("1,a", "x"));
  assertEquals(asOptionalJson('{"a":1}', "j"), { a: 1 });
  assertEquals(asOptionalJson("", "j"), undefined);
});

Deno.test("client: helpers reject bad input loudly", () => {
  let threw = false;
  try {
    toIdList("1,a", "ids");
  } catch (e) {
    threw = (e as Error).message.includes('"a" is not a numeric id');
  }
  assert(threw);
  let jsonThrew = false;
  try {
    asOptionalJson("{nope", "extraFields");
  } catch (e) {
    jsonThrew = (e as Error).message === "extraFields is not valid JSON";
  }
  assert(jsonThrew);
});
