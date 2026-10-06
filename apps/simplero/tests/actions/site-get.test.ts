import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/site-get.ts";
import { mockCtx, pathOf, recordBody } from "../_helpers.ts";

Deno.test("site-get: is a read action with a required numeric id", () => {
  assertEquals(action.key, "site-get");
  assertEquals(action.type, "read");
  const id = action.params!.find((p) => p.key === "id");
  assertEquals(id?.required, true);
  assertEquals(id?.type, "number");
});

Deno.test("site-get: GETs /api/v2/sites/42 and returns the unwrapped record", async () => {
  const { ctx, calls } = mockCtx([{ body: recordBody({ id: 42, name: "x" }) }]);
  const out = await action.execute({ id: 42 }, ctx) as { record: { id: number } };
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/sites/42");
  assertEquals(out.record.id, 42);
});

Deno.test("site-get: sends a User-Agent and never an Authorization or API-key header", async () => {
  const { ctx, calls } = mockCtx([{ body: recordBody({ id: 1 }) }]);
  await action.execute({ id: 1 }, ctx);
  assert(calls[0].headers["user-agent"]?.startsWith("w6w-simplero/"));
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("site-get: a 404 HTML page is reported as not an API route, not parsed", async () => {
  const { ctx } = mockCtx([
    {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" },
      body: "<html>nope</html>",
    },
  ]);
  await assertRejects(async () => await action.execute({ id: 9 }, ctx), Error, "HTML page");
});

Deno.test("site-get: a 200 with no data record is an error, not an empty success", async () => {
  const { ctx } = mockCtx([{ body: { something: "else" } }]);
  await assertRejects(async () => await action.execute({ id: 9 }, ctx), Error, "no `data` record");
});
