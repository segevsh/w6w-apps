import { assert, assertEquals, assertRejects } from "@std/assert";
import formList from "../../actions/form-list.ts";
import { errorBody, listPage, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("form-list: sends mapped query params and flags as 1", async () => {
  const { ctx, calls } = mockCtx([{ body: listPage([{ uuid: "f1", name: "NPS" }]) }]);
  const out = await formList.execute(
    { list: "published", page: 2, pageLength: 25, includeInfo: true, includeConfig: true },
    ctx,
  ) as { items: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v1/forms");
  assertEquals(queryOf(calls[0].url), {
    list: "published",
    page: "2",
    page_length: "25",
    include_info: "1",
    include_config: "1",
  });
  assertEquals(out.items.length, 1);
});

Deno.test("form-list: sends no query when nothing is set", async () => {
  const { ctx, calls } = mockCtx([{ body: listPage([]) }]);
  await formList.execute({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("form-list: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("API key does not look valid") }]);
  const err = await assertRejects(
    () => Promise.resolve(formList.execute({}, ctx)),
    Error,
  );
  assert(err.message.includes("API key does not look valid"), err.message);
  assert(err.message.includes("401"), err.message);
});
