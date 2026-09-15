import { assertEquals, assertRejects } from "@std/assert";
import { mockNationBuilderCtx } from "../_helpers.ts";
import action from "../../actions/event-create.ts";

Deno.test("event-create: requires either a siteId or an existing pageId", async () => {
  const { ctx } = mockNationBuilderCtx([]);
  await assertRejects(
    async () => {
      await action.execute({ name: "Rally" }, ctx);
    },
    Error,
    "siteId",
  );
});

Deno.test("event-create: sideposts a new page when no pageId is given", async () => {
  const { ctx, calls } = mockNationBuilderCtx([{
    body: { data: { id: "1", type: "events", attributes: { start_at: null } } },
  }]);
  await action.execute({ name: "Rally", siteId: "5", venueName: "Town Hall" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.type, "events");
  assertEquals(body.data.attributes.venue_name, "Town Hall");
  assertEquals(body.data.relationships.page.data, {
    type: "pages",
    "temp-id": "event-page",
    method: "create",
  });
  assertEquals(body.included, [{
    type: "pages",
    "temp-id": "event-page",
    attributes: {
      name: "Rally",
      title: "Rally",
      site_id: "5",
      page_type_name: "Basic",
      permission_level: "anyone",
      status: "unlisted",
    },
  }]);
});

Deno.test("event-create: links an existing page instead, with no sidepost", async () => {
  const { ctx, calls } = mockNationBuilderCtx([{ body: { data: { id: "1", type: "events" } } }]);
  await action.execute({ name: "Rally", pageId: "77" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.relationships.page.data, { type: "pages", id: "77" });
  assertEquals("included" in body, false);
});
