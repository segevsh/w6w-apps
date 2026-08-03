import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx, param } from "../_helpers.ts";
import action from "../../actions/list-custom-fields.ts";

Deno.test("list-custom-fields: GETs the recommended schema endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { fields: [] } }]);
  await action.execute({ objectType: "lead" }, ctx);
  // The schema endpoint is the one Close recommends: it includes SHARED fields,
  // which the per-type /custom_field/lead/ endpoint omits.
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/custom_field_schema/lead/");
});

Deno.test("list-custom-fields: accepts every documented object type, including compound ones", async () => {
  for (
    const objectType of [
      "lead",
      "contact",
      "opportunity",
      "activity/actitype_1h5m6uHM9BZOpwVhyRJb4Y",
      "custom_object/cotype_abc123",
    ]
  ) {
    const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
    await action.execute({ objectType }, ctx);
    assertEquals(new URL(calls[0].url).pathname, `/api/v1/custom_field_schema/${objectType}/`);
  }
});

Deno.test("list-custom-fields: rejects anything outside the documented grammar", async () => {
  for (
    const bad of ["../lead", "lead/../..", "leads", "activity", "activity/", "custom_object/a b"]
  ) {
    const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
    await assertRejects(
      async () => await action.execute({ objectType: bad }, ctx),
      Error,
      "unsupported",
    );
    // It must fail before any request goes out.
    assertEquals(calls.length, 0, bad);
  }
});

Deno.test("list-custom-fields: validates at the form as well as in execute", () => {
  const p = param(action, "objectType");
  assertEquals(p.required, true);
  assert(typeof p.validation?.pattern === "string");
});
