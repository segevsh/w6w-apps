import { assertEquals } from "@std/assert";
import action from "../../actions/list-timezones.ts";
import { API_ROOT, mockCtx, urlOf } from "../_helpers.ts";

const zones = [
  {
    label: "Eastern Time (US & Canada)",
    name: "Eastern Time (US & Canada)",
    tzName: "America/New_York",
  },
  {
    label: "Central Time (US & Canada)",
    name: "Central Time (US & Canada)",
    tzName: "America/Chicago",
  },
];

Deno.test("list-timezones: reads /timezones with no parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: zones }]);
  const result = await action.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(urlOf(calls[0]), `${API_ROOT}/timezones`);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].body, null);
  assertEquals(result, zones);
});

Deno.test("list-timezones: the bare array is returned verbatim", () => {
  assertEquals(action.type, "read");
  assertEquals(action.params, []);
  assertEquals((action.output as Array<{ key: string }>)[0].key, "[]");
  assertEquals((action.output as Array<{ key: string; type: string }>)[0].type, "array");
});

Deno.test("list-timezones: the `name` field's contract is documented, not assumed", () => {
  assertEquals(/name/.test(action.description!), true, action.description);
  assertEquals(/timeZone/.test(action.description!), true, action.description);
});
