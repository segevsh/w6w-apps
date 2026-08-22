import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/attachment-get.ts";

const display = { site: "acme" };

Deno.test("attachment-get: returns metadata including the download link", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: "att1", title: "diagram.png", downloadLink: "/download/attachments/1/diagram.png" },
  }], { display });
  const result = await action.execute!({ attachmentId: "att1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/wiki/api/v2/attachments/att1");
  assertEquals(
    (result as Record<string, unknown>).downloadLink,
    "/download/attachments/1/diagram.png",
  );
});

Deno.test("attachment-get: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`attachmentId`");
  assertEquals(calls.length, 0);
});
