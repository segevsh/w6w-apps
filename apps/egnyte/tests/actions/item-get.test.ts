import { assertEquals, assertRejects } from "@std/assert";
import { mockEgnyteCtx } from "../_helpers.ts";
import action from "../../actions/item-get.ts";

Deno.test("item-get: GETs /v1/fs/<encoded path>", async () => {
  const { ctx, calls } = mockEgnyteCtx([{ body: { name: "Docs", is_folder: true } }]);
  const out = await action.execute({ path: "/Shared/My Docs/a?b" }, ctx);
  assertEquals(calls[0].url, "https://acme.egnyte.com/pubapi/v1/fs/Shared/My%20Docs/a%3Fb");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { name: "Docs", is_folder: true });
});

Deno.test("item-get: passes paging and sort, omits list_content unless turned off", async () => {
  const { ctx, calls } = mockEgnyteCtx([{ body: {} }, { body: {} }]);
  await action.execute({
    path: "Shared",
    count: 5,
    offset: 10,
    sortBy: "name",
    sortDirection: "descending",
  }, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.egnyte.com/pubapi/v1/fs/Shared?count=5&offset=10&sort_by=name&sort_direction=descending",
  );
  await action.execute({ path: "Shared", listContent: false }, ctx);
  assertEquals(calls[1].url, "https://acme.egnyte.com/pubapi/v1/fs/Shared?list_content=false");
});

Deno.test("item-get: surfaces a 404 with the body", async () => {
  const { ctx } = mockEgnyteCtx([{ status: 404, body: { errorMessage: "not found" } }]);
  await assertRejects(async () => await action.execute({ path: "x" }, ctx), Error, "Egnyte 404");
});
