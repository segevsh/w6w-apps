import { assert, assertEquals, assertRejects } from "@std/assert";
import formHistory from "../../actions/form-history.ts";
import { errorBody, listPage, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("form-history: GETs history for the survey with paging", async () => {
  const { ctx, calls } = mockCtx([{ body: listPage([{ uuid: "h1", action: "update" }]) }]);
  const out = await formHistory.execute({ formUuid: "f1", page: 3, pageLength: 2 }, ctx) as {
    items: unknown[];
  };
  assertEquals(pathOf(calls[0].url), "/v1/forms/history");
  assertEquals(queryOf(calls[0].url), { form_uuid: "f1", page: "3", page_length: "2" });
  assertEquals(out.items.length, 1);
});

Deno.test("form-history: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("API key does not look valid") }]);
  const err = await assertRejects(
    () => Promise.resolve(formHistory.execute({ formUuid: "f1" }, ctx)),
    Error,
  );
  assert(err.message.includes("API key does not look valid"), err.message);
  assert(err.message.includes("401"), err.message);
});
