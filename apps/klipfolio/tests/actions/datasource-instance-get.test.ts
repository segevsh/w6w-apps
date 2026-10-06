import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/datasource-instance-get.ts";
import { mockCtx } from "../_helpers.ts";

const INPUT = {
  "instance_id": "instance1",
  "client_id": "c1",
};
const RESPONSE = {
  "data": {
    "id": "i1",
    "datasource_id": "d1",
    "refresh_fail_count": 0,
  },
  "meta": {
    "success": true,
    "status": 200,
  },
};

Deno.test("datasource-instance-get: sends GET /datasource-instances/instance1 with the mapped input", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  const out = await action.execute!(INPUT, ctx);
  const url = new URL(calls[0].url);
  assertEquals(
    url.origin + url.pathname,
    "https://app.klipfolio.com/api/1.0/datasource-instances/instance1",
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), { "client_id": "c1" });
  assertEquals(calls[0].body, null);
  assertEquals(JSON.parse(JSON.stringify(out)), {
    "id": "i1",
    "datasource_id": "d1",
    "refresh_fail_count": 0,
  });
});

Deno.test("datasource-instance-get: sends no optional field when only required input is given", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute!({ "instance_id": "instance1" } as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.search, "");
});

Deno.test("datasource-instance-get: sends no credential header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute!(INPUT, ctx);
  assert(!("authorization" in calls[0].headers) && !("kf-api-key" in calls[0].headers));
});

Deno.test("datasource-instance-get: surfaces Klipfolio's error envelope as a thrown error", async () => {
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

Deno.test("datasource-instance-get: declares type, idempotency and output", () => {
  assertEquals(action.type, "read");
  assert(Array.isArray(action.output) && action.output.length > 0);
});
