import { assertEquals } from "@std/assert";
import timeoffCreate from "../../actions/timeoff-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("timeoff-create - POSTs /timeoffs with an array of people IDs and full_day as 1/0", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { timeoff_id: 5 } }]);
  const out = await timeoffCreate.execute(
    {
      timeoffTypeId: 1345,
      peopleIds: [23442, 22321],
      startDate: "2025-11-16",
      endDate: "2025-12-06",
      fullDay: true,
    },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v3/timeoffs");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.people_ids, [23442, 22321]);
  assertEquals(body.full_day, 1);
  assertEquals(body.timeoff_type_id, 1345);
  assertEquals(out, { timeoff_id: 5 });
});

Deno.test("timeoff-create - a comma-separated peopleIds string is parsed into numbers", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await timeoffCreate.execute(
    { timeoffTypeId: 1, peopleIds: "1, 2, 3", startDate: "2025-01-01", endDate: "2025-01-02" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).people_ids, [1, 2, 3]);
});
