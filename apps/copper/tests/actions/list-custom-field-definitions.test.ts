import { assertEquals } from "@std/assert";
import { mockCtx, run } from "../_helpers.ts";
import action from "../../actions/list-custom-field-definitions.ts";

Deno.test("list-custom-field-definitions: GETs /custom_field_definitions", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: [{ id: 100764, name: "Segment", data_type: "Dropdown", available_on: ["person"] }],
  }]);
  const out = await run<{ definitions: unknown[] }>(action, {}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.copper.com/developer_api/v1/custom_field_definitions");
  assertEquals(out.definitions, [
    { id: 100764, name: "Segment", data_type: "Dropdown", available_on: ["person"] },
  ]);
});

Deno.test("list-custom-field-definitions: an empty body yields an empty array", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "" }]);
  assertEquals((await run<{ definitions: unknown[] }>(action, {}, ctx)).definitions, []);
});
