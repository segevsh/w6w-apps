import { assertEquals, assertRejects } from "@std/assert";
import transcriptionList from "../../actions/transcription-list.ts";
import { mockCtx, pageBody, pathOf, queryOf } from "../_helpers.ts";

Deno.test("transcription-list: by meeting needs no date window and folds the array response", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ uuid: "t1", meeting_uuid: "m1" }] }]);
  const out = await transcriptionList.execute({ meetingUuid: "m1" }, ctx) as {
    results: unknown[];
    count: number;
  };
  assertEquals(pathOf(calls[0].url), "/v1/transcriptions/");
  assertEquals(queryOf(calls[0].url), { meeting_uuid: "m1" });
  assertEquals(out.count, 1);
});

Deno.test("transcription-list: windowed listing sends page and page_size", async () => {
  const { ctx, calls } = mockCtx([{ body: pageBody([]) }]);
  await transcriptionList.execute({
    fromDate: "2026-10-01T00:00:00Z",
    toDate: "2026-10-02T00:00:00Z",
    page: 2,
    pageSize: 100,
    crmLeadIds: ["l1", "l2"],
  }, ctx);
  assertEquals(queryOf(calls[0].url), {
    from_date: "2026-10-01T00:00:00Z",
    to_date: "2026-10-02T00:00:00Z",
    page: "2",
    page_size: "100",
    crm_lead_ids: "l1,l2",
  });
});

Deno.test("transcription-list: neither a meeting nor a window is refused", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await transcriptionList.execute({}, ctx), Error, "fromDate");
  assertEquals(calls.length, 0);
});
