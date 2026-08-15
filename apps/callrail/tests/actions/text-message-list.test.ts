import { assertEquals } from "@std/assert";
import textMessageList from "../../actions/text-message-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("text-message-list: hits text-messages.json and forwards search + date filters", async () => {
  const { ctx, calls } = mockCtx([
    { body: listEnvelope("conversations", [{ id: "KZaGR" }]) },
  ]);
  const out = await textMessageList.execute(
    { accountId: "ACC1", search: "404-222", startDate: "2016-07-01", endDate: "2016-07-31" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/v3/a/ACC1/text-messages.json");
  const q = queryOf(calls[0].url);
  assertEquals(q.search, "404-222");
  assertEquals(q.start_date, "2016-07-01");
  assertEquals(q.end_date, "2016-07-31");
  assertEquals(out.conversations, [{ id: "KZaGR" }]);
});
