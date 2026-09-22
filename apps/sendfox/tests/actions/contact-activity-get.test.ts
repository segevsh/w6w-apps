import { assertEquals } from "@std/assert";
import contactActivityGet from "../../actions/contact-activity-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-activity-get: GETs /contacts/{id}/activity", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        contact: { last_opened_at: "2026-08-01T00:00:00.000Z" },
        deliverables: { data: [{ campaign_title: "August" }] },
      },
    },
  ]);
  const out = await contactActivityGet.execute({ id: 5 }, ctx) as {
    deliverables: { data: unknown[] };
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/contacts/5/activity");
  assertEquals(out.deliverables.data.length, 1);
});
