import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  asTwistError,
  describeError,
  encodeParams,
  idList,
  jsonValue,
  normalize,
  omit,
  twist,
  TwistError,
} from "../../lib/client.ts";
import { formOf, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("encodeParams: drops unset values, stringifies scalars, JSON-encodes lists", () => {
  const p = encodeParams({
    a: undefined,
    b: null,
    c: "",
    d: 0,
    e: false,
    f: [1, 2],
    g: { x: true },
    h: "text",
  });
  assertEquals(Object.fromEntries(p), {
    d: "0",
    e: "false",
    f: "[1,2]",
    g: '{"x":true}',
    h: "text",
  });
});

Deno.test("idList: comma list, JSON array, array, keyword and empties", () => {
  assertEquals(idList("10, 11"), [10, 11]);
  assertEquals(idList("[10, 11]"), [10, 11]);
  assertEquals(idList([1, 2]), [1, 2]);
  assertEquals(idList("EVERYONE"), "EVERYONE");
  assertEquals(idList("-5"), [-5]);
  assertEquals(idList(""), undefined);
  assertEquals(idList(undefined), undefined);
  assertEquals(idList(" , "), undefined);
});

Deno.test("jsonValue: parses pasted JSON, passes objects, rejects garbage", () => {
  assertEquals(jsonValue('{"a":1}'), { a: 1 });
  assertEquals(jsonValue({ a: 1 }), { a: 1 });
  assertEquals(jsonValue(" "), undefined);
  try {
    jsonValue("{nope");
    assert(false, "should have thrown");
  } catch (e) {
    assertEquals((e as Error).message, "Expected valid JSON for this field");
  }
});

Deno.test("normalize: arrays become items, scalars become result, objects pass through", () => {
  assertEquals(normalize([1]), { items: [1] });
  assertEquals(normalize("t"), { result: "t" });
  assertEquals(normalize(undefined), { result: null });
  assertEquals(normalize({ id: 1 }), { id: 1 });
});

Deno.test("omit: removes only the named keys and does not mutate its input", () => {
  const src = { a: 1, token: "x" };
  assertEquals(omit(src, ["token"]), { a: 1 });
  assertEquals(src, { a: 1, token: "x" });
});

Deno.test("asTwistError: needs the documented shape, nothing looser", () => {
  assertEquals(asTwistError({ error_code: 200, error_string: "Invalid token" })?.error_code, 200);
  assertEquals(
    asTwistError({ error: "BAD_REQUEST", error_message: "Invalid scope" })?.error,
    "BAD_REQUEST",
  );
  assertEquals(asTwistError({ error_code: "200" }), undefined);
  assertEquals(asTwistError([]), undefined);
  assertEquals(asTwistError("<html>"), undefined);
  assertEquals(asTwistError(null), undefined);
});

Deno.test("describeError: auth codes get a reconnect hint, others do not", () => {
  assert(
    describeError(403, { error_code: 200, error_string: "Invalid token" }).includes("reconnect"),
  );
  assert(
    describeError(401, { error_code: 120, error_string: "You are not logged in" }).includes(
      "reconnect",
    ),
  );
  assertEquals(
    describeError(404, { error_code: 110, error_string: "Resource not found" }),
    "Twist error 110: Resource not found (HTTP 404)",
  );
  assertEquals(
    describeError(400, { error: "BAD_REQUEST", error_message: "Invalid scope" }),
    "Twist error BAD_REQUEST: Invalid scope (HTTP 400)",
  );
  assertEquals(describeError(502, undefined), "Twist returned HTTP 502");
});

Deno.test("twist: GET puts params in the query string and defaults to /api/v3", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1 }] }]);
  const out = await twist(ctx, {
    path: "/channels/get",
    params: { workspace_id: 5, archived: true },
  });
  assertEquals(pathOf(calls[0].url), "/api/v3/channels/get");
  assertEquals(queryOf(calls[0].url), { workspace_id: "5", archived: "true" });
  assertEquals(calls[0].body, null);
  assertEquals(out, { items: [{ id: 1 }] });
});

Deno.test("twist: POST sends a form body and honours version 4", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await twist(ctx, { method: "POST", path: "/workspace_users/add", version: 4, params: { id: 9 } });
  assertEquals(pathOf(calls[0].url), "/api/v4/workspace_users/add");
  assertEquals(formOf(calls[0].body), { id: "9" });
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
});

Deno.test("twist: never sets an Authorization header — sign does that", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await twist(ctx, { path: "/workspaces/get_default" });
  assert(!("authorization" in calls[0].headers));
});

Deno.test("twist: an empty 200 body becomes { result: null }", async () => {
  const { ctx } = mockCtx([{ body: undefined }]);
  assertEquals(await twist(ctx, { method: "POST", path: "/threads/pin" }), { result: null });
});

Deno.test("twist: a JSON string body (get_local_time) becomes { result }", async () => {
  const { ctx } = mockCtx([{ body: '"2026-10-06 07:55:40"' }]);
  assertEquals(await twist(ctx, { path: "/x" }), { result: "2026-10-06 07:55:40" });
});

Deno.test("twist: an error body throws a TwistError carrying code, status and extra", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: {
      error_code: 19,
      error_string: "Required argument is missing",
      error_extra: { argument: "id" },
    },
  }]);
  const err = await assertRejects(() => twist(ctx, { path: "/x" }), TwistError) as TwistError;
  assertEquals(err.code, 19);
  assertEquals(err.status, 400);
  assertEquals(err.extra, { argument: "id" });
});

Deno.test("twist: an error-shaped body on a 200 still throws (verdict is from the body)", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { error_code: 109, error_string: "Forbidden" } }]);
  await assertRejects(() => twist(ctx, { path: "/x" }), TwistError, "Twist error 109");
});

Deno.test("twist: a non-JSON failure is a bare HTTP error, not a crash", async () => {
  const { ctx } = mockCtx([{
    status: 502,
    body: "<html>bad gateway</html>",
    headers: { "content-type": "text/html" },
  }]);
  await assertRejects(() => twist(ctx, { path: "/x" }), TwistError, "Twist returned HTTP 502");
});
