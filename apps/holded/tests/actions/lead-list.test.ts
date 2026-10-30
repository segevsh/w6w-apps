import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import leadList from "../../actions/lead-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("lead-list: metadata", () => {
  assertEquals(leadList.type, "read");
  assertEquals(leadList.params?.length, 0);
});

test("lead-list: GET /leads, no query params, wraps the bare array", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "l1" }] }]);
  const result = await leadList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/api/crm/v1/leads");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(result, { leads: [{ id: "l1" }] });
});
