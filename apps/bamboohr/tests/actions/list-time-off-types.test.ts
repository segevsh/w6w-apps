import { assert, assertEquals } from "@std/assert";
import listTimeOffTypes from "../../actions/list-time-off-types.ts";
import { description, mockCtx, param } from "../_helpers.ts";

Deno.test("list-time-off-types: searches /meta/time_off/types", async () => {
  assertEquals(listTimeOffTypes.type, "search");
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await listTimeOffTypes.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/meta/time_off/types");
  assertEquals(url.search, "");
});

Deno.test("list-time-off-types: the boolean sends the single documented `mode=request`", async () => {
  // `mode` has exactly one legal value, so a raw string param would let a typo
  // silently return the unfiltered list.
  assertEquals(param(listTimeOffTypes, "requestableOnly").type, "boolean");

  const { ctx, calls } = mockCtx([{ body: [] }, { body: [] }]);
  await listTimeOffTypes.execute({ requestableOnly: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("mode"), "request");

  await listTimeOffTypes.execute({ requestableOnly: false }, ctx);
  assertEquals(new URL(calls[1].url).searchParams.has("mode"), false);
});

Deno.test("list-time-off-types: points at the action that needs its ids", () => {
  // This exists because Create Time Off Request requires `timeOffTypeId` and
  // there is no other way to discover a valid value.
  assert(/timeOffTypeId/i.test(description(listTimeOffTypes)));
});
