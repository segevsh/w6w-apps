import { assertEquals } from "@std/assert";
import campaignList from "../../actions/campaign-list.ts";
import { API_ROOT, mockCtx, page, queryOf } from "../_helpers.ts";

const CAMPAIGN = {
  campaignId: "507f191e810c19729de860ea",
  title: "Spring sale",
  state: "COMPLETED",
  type: "IMMEDIATELY",
};

Deno.test("campaign-list: reads the campaigns page and returns its rows", async () => {
  const { ctx, calls } = mockCtx([{ body: page([CAMPAIGN], { totalElements: 1 }) }]);
  const result = await campaignList.execute({}, ctx) as { content: unknown[] };

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/api/campaigns`);
  assertEquals(result.content, [CAMPAIGN]);
});

/**
 * The endpoint's own description: omitting `type` returns only immediate
 * campaigns. `ALL` is the value that surfaces scheduled and recurring ones too.
 */
Deno.test("campaign-list: forwards type, state and the date range verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await campaignList.execute(
    {
      type: "ALL",
      state: "COMPLETED",
      listNameOrId: "My First List",
      startDateFrom: "2021-04-28T23:20:08.489Z",
      startDateTo: "2021-05-28T23:20:08.489Z",
    },
    ctx,
  );
  assertEquals(queryOf(calls[0].url), {
    type: "ALL",
    state: "COMPLETED",
    listNameOrId: "My First List",
    startDateFrom: "2021-04-28T23:20:08.489Z",
    startDateTo: "2021-05-28T23:20:08.489Z",
  });
});

Deno.test("campaign-list: type defaults to blank, which the vendor reads as immediate-only", () => {
  const type = campaignList.params!.find((p) => p.key === "type");
  assertEquals(type?.default, undefined);
  assertEquals(type?.hint?.includes("immediate"), true);
});
