import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/datasource-refresh-many.ts";
import { mockCtx } from "../_helpers.ts";

const INPUT = {
  "datasources": "d1,d2",
};
const RESPONSE = {
  "meta": {
    "success": true,
    "status": 200,
  },
  "data": {
    "op_requested": "refresh",
    "success": true,
    "total_datasources_requested": 2,
    "total_instances_requested": 2,
    "queue_status": 200,
    "total_instances_queued": 2,
  },
};

Deno.test("datasource-refresh-many: sends POST /datasources/@/refresh with the mapped input", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  const out = await action.execute!(INPUT, ctx);
  const url = new URL(calls[0].url);
  assertEquals(
    url.origin + url.pathname,
    "https://app.klipfolio.com/api/1.0/datasources/@/refresh",
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), { "datasources": ["d1", "d2"] });
  assertEquals(JSON.parse(JSON.stringify(out)), {
    "success": true,
    "op": "refresh",
    "total_datasources_requested": 2,
    "total_instances_requested": 2,
    "total_instances_queued": 2,
  });
});

Deno.test("datasource-refresh-many: sends no optional field when only required input is given", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute!({ "datasources": "d1,d2" } as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.search, "");
  assertEquals(JSON.parse(calls[0].body!), { "datasources": ["d1", "d2"] });
});

Deno.test("datasource-refresh-many: sends no credential header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute!(INPUT, ctx);
  assert(!("authorization" in calls[0].headers) && !("kf-api-key" in calls[0].headers));
});

Deno.test("datasource-refresh-many: surfaces Klipfolio's error envelope as a thrown error", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: {
      meta: { success: false, status: 400, error_code: "bad_request", error_desc: "bad input" },
    },
  }]);
  await assertRejects(
    async () => await action.execute!(INPUT, ctx),
    Error,
    "bad input (bad_request)",
  );
});

Deno.test("datasource-refresh-many: declares type, idempotency and output", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  assert(Array.isArray(action.output) && action.output.length > 0);
});
