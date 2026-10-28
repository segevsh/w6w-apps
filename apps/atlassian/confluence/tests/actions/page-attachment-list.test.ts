import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/page-attachment-list.ts";

const display = { site: "acme" };

Deno.test("page-attachment-list: filters on media type and filename", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { results: [{ id: "att1" }], _links: {} } }],
    {
      display,
    },
  );
  const result = await action.execute!({
    pageId: "1",
    mediaType: "image/png",
    filename: "diagram.png",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/wiki/api/v2/pages/1/attachments");
  assertEquals(url.searchParams.get("mediaType"), "image/png");
  assertEquals(url.searchParams.get("filename"), "diagram.png");
  assertEquals(result, [{ id: "att1" }]);
});

Deno.test("page-attachment-list: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`pageId` is required");
  assertEquals(calls.length, 0);
});
