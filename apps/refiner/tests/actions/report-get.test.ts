import { assert, assertEquals, assertRejects } from "@std/assert";
import reportGet from "../../actions/report-get.ts";
import { errorBody, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("report-get: GETs /v1/reporting with type, arrays and bracketed filters", async () => {
  const reply = { data: { detractors: 5, passives: 21, promoters: 40 }, count: 66, nps: 53 };
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const out = await reportGet.execute(
    {
      type: "nps",
      formUuids: ["f1", "f2"],
      segmentUuids: "s1",
      tagUuids: "t1",
      questionIdentifiers: "nps",
      dateRangeStart: "2026-01-01",
      dateRangeEnd: "2026-02-01",
      responseData: { nps: 9 },
      contactData: { country: "France" },
      accountData: { plan: "pro" },
    },
    ctx,
  );
  const u = new URL(calls[0].url);
  assertEquals(u.pathname, "/v1/reporting");
  assertEquals(u.searchParams.get("type"), "nps");
  assertEquals(u.searchParams.getAll("form_uuids[]"), ["f1", "f2"]);
  assertEquals(u.searchParams.getAll("segment_uuids[]"), ["s1"]);
  assertEquals(u.searchParams.getAll("tag_uuids[]"), ["t1"]);
  assertEquals(u.searchParams.getAll("question_identifiers[]"), ["nps"]);
  assertEquals(u.searchParams.get("date_range_start"), "2026-01-01");
  assertEquals(u.searchParams.get("response_data[nps]"), "9");
  assertEquals(u.searchParams.get("contact_data[country]"), "France");
  assertEquals(u.searchParams.get("account_data[plan]"), "pro");
  assertEquals(out, reply);
});

Deno.test("report-get: only the type is sent when nothing else is set", async () => {
  const { ctx, calls } = mockCtx([{ body: { views: 1, responses: 1 } }]);
  await reportGet.execute({ type: "count" }, ctx);
  assertEquals(queryOf(calls[0].url), { type: "count" });
});

Deno.test("report-get: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("API key does not look valid") }]);
  const err = await assertRejects(
    () => Promise.resolve(reportGet.execute({ type: "nps" }, ctx)),
    Error,
  );
  assert(err.message.includes("API key does not look valid"), err.message);
  assert(err.message.includes("401"), err.message);
});
