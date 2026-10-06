import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/klip-update.ts";
import { mockCtx } from "../_helpers.ts";

const INPUT = {
  "klip_id": "klip1",
  "name": "Example",
  "description": "An example",
  "client_id": "c1",
};
const RESPONSE = {
  "meta": {
    "success": true,
    "status": 200,
  },
  "data": {},
};

Deno.test("klip-update: sends PUT /klips/klip1 with the mapped input", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  const out = await action.execute!(INPUT, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://app.klipfolio.com/api/1.0/klips/klip1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(Object.fromEntries(url.searchParams), { "client_id": "c1" });
  assertEquals(JSON.parse(calls[0].body!), { "name": "Example", "description": "An example" });
  assertEquals(JSON.parse(JSON.stringify(out)), { "success": true });
});

Deno.test("klip-update: sends no optional field when only required input is given", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute!({ "klip_id": "klip1" } as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.search, "");
  assertEquals(JSON.parse(calls[0].body!), {});
});

Deno.test("klip-update: sends no credential header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute!(INPUT, ctx);
  assert(!("authorization" in calls[0].headers) && !("kf-api-key" in calls[0].headers));
});

Deno.test("klip-update: surfaces Klipfolio's error envelope as a thrown error", async () => {
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

Deno.test("klip-update: declares type, idempotency and output", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
  assert(Array.isArray(action.output) && action.output.length > 0);
});
