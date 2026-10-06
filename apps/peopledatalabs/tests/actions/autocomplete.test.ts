import { assertEquals, assertRejects } from "@std/assert";
import action, { AUTOCOMPLETE_FIELDS } from "../../actions/autocomplete.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("autocomplete: GETs /v5/autocomplete with field, text and size", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: 200, data: [{ name: "tesla", count: 9 }] } }]);
  const out = await action.execute!(
    { field: "company", text: "tes", size: 5 } as never,
    ctx,
  ) as Record<
    string,
    unknown
  >;
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v5/autocomplete");
  assertEquals(Object.fromEntries(url.searchParams), { field: "company", text: "tes", size: "5" });
  assertEquals((out.data as unknown[]).length, 1);
});

Deno.test("autocomplete: field is required and offers only current fields (not deprecated `location`)", async () => {
  await assertRejects(
    async () => await action.execute!({} as never, mockCtx([]).ctx),
    Error,
    "field is required",
  );
  assertEquals(AUTOCOMPLETE_FIELDS.includes("location" as never), false);
  assertEquals(AUTOCOMPLETE_FIELDS.includes("location_name"), true);
});

Deno.test("autocomplete: an error status throws (no 404 swallowing here)", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { status: 429, error: { type: "rate_limit_error", message: "too quick" } },
  }]);
  await assertRejects(
    async () => await action.execute!({ field: "title" } as never, ctx),
    Error,
    "rate_limit_error",
  );
});
