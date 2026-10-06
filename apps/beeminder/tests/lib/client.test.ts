import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  BeeminderClient,
  BeeminderError,
  datapointPath,
  defined,
  formatError,
  goalPath,
  splitList,
  userPath,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: builds the /api/v1 URL, drops empty query values, GET by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { a: 1 } }]);
  const res = await new BeeminderClient(ctx).request("/x.json", {
    query: { q: "v", e: "", n: undefined, f: false },
  });
  assertEquals(res.data, { a: 1 });
  assertEquals(calls[0].url, "https://www.beeminder.com/api/v1/x.json?q=v&f=false");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("client: form bodies are urlencoded, json bodies keep nulls", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  const c = new BeeminderClient(ctx);
  await c.request("/x.json", { form: { a: "b c", n: undefined, z: 0 } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(calls[0].body, "a=b+c&z=0");
  await c.request("/x.json", { method: "PUT", json: { goalval: null } });
  assertEquals(calls[1].method, "PUT");
  assertEquals(calls[1].body, '{"goalval":null}');
});

Deno.test("client: a `true` body (refresh_graph) parses; errors throw with the vendor text", async () => {
  const ok = mockCtx([{ body: "true" }]);
  assertEquals((await new BeeminderClient(ok.ctx).request("/x.json")).data, true);
  const bad = mockCtx([{ status: 406, body: { errors: "newsafety cannot exceed 5" } }]);
  const err = await assertRejects(
    () => new BeeminderClient(bad.ctx).request("/x.json"),
    BeeminderError,
    "newsafety cannot exceed 5",
  );
  assertEquals(err.httpStatus, 406);
});

Deno.test("client: formatError reads object, string and singular error shapes with hints", () => {
  const obj = formatError(401, "GET", "/p", { errors: { message: "No such auth_token" } }, "");
  assert(obj.includes("No such auth_token") && obj.includes("personal token"));
  assert(formatError(404, "GET", "/p", { error: "not found" }, "").includes("not found"));
  assert(formatError(500, "GET", "/p", undefined, "boom").includes("boom"));
  assert(formatError(500, "GET", "/p", { errors: { a: 1 } }, "").includes('{"a":1}'));
});

Deno.test("client: path helpers encode segments and default the user to me", () => {
  assertEquals(userPath(), "/users/me");
  assertEquals(userPath(" "), "/users/me");
  assertEquals(goalPath("al ice", "my/goal"), "/users/al%20ice/goals/my%2Fgoal");
  assertEquals(datapointPath("a", "g", "id1"), "/users/a/goals/g/datapoints/id1");
  try {
    goalPath("a", " ");
    throw new Error("should have thrown");
  } catch (e) {
    assertEquals((e as Error).message, "slug is required");
  }
});

Deno.test("client: defined keeps null but drops undefined; splitList splits", () => {
  assertEquals(defined({ a: null, b: undefined, c: 0 }), { a: null, c: 0 });
  assertEquals(splitList("a, b;c\nd"), ["a", "b", "c", "d"]);
  assertEquals(splitList(["x", " "]), ["x"]);
  assertEquals(splitList(undefined), []);
});
