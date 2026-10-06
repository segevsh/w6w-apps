import { assertEquals } from "@std/assert";
import postReschedule from "../../actions/post-reschedule.ts";
import { envelope, jsonBody, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("post-reschedule: PATCH with fields=publicationDate and only the date", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(true) }]);
  const out = await postReschedule.execute({
    blogId: "9",
    id: "5",
    publicationDate: "2026-12-01T08:00:00",
    timezone: "UTC",
  }, ctx);
  assertEquals(out, { success: true });
  assertEquals(calls[0].method, "PATCH");
  assertEquals(queryOf(calls[0].url).fields, "publicationDate");
  assertEquals(jsonBody(calls[0]), {
    publicationDate: { dateTime: "2026-12-01T08:00:00", timezone: "UTC" },
  });
});
