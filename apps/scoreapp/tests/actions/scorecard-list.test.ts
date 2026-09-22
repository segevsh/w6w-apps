import { assert, assertEquals } from "@std/assert";
import scorecardList from "../../actions/scorecard-list.ts";
import { mockCtx, page, queryOf } from "../_helpers.ts";

Deno.test("scorecard-list: reads the documented collection path", async () => {
  const body = page([{ id: "9e01daab-49c6-428b-9209-b5b0607acad3", status: "live" }]);
  const { ctx, calls } = mockCtx([{ body }]);

  const result = await scorecardList.execute({}, ctx);

  assertEquals(calls[0].url.split("?")[0], "https://open-api.scoreapp.com/scorecards");
  assertEquals(queryOf(calls[0].url), {});
  // The page envelope is returned untouched, links and meta included.
  assertEquals(result, body as never);
});

Deno.test("scorecard-list: every documented filter is forwarded under its own name", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);

  await scorecardList.execute(
    {
      limit: 50,
      search: "customer",
      status: "live",
      order_by: "name",
      order_dir: "asc",
    },
    ctx,
  );

  assertEquals(queryOf(calls[0].url), {
    limit: "50",
    search: "customer",
    status: "live",
    order_by: "name",
    order_dir: "asc",
  });
});

Deno.test("scorecard-list: an empty form sends no filters at all, which is the API's own default", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);

  await scorecardList.execute({ limit: undefined, search: "" }, ctx);

  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("scorecard-list: the status param offers exactly the three documented modes", () => {
  const status = scorecardList.params?.find((p) => p.key === "status");

  assertEquals(status?.type, "select");
  assertEquals(
    (status?.options as Array<{ value: string }>).map((o) => o.value),
    ["draft", "live", "template"],
  );
});

Deno.test("scorecard-list: nothing is required and the vendor's 100-row default is stated", () => {
  assertEquals(scorecardList.type, "search");
  assertEquals(scorecardList.resource, "scorecard");
  assert(scorecardList.params?.every((p) => p.required !== true), "no param is required");
  const limit = scorecardList.params?.find((p) => p.key === "limit");
  assert(/Defaults to 100/.test(limit?.hint ?? ""), limit?.hint);
  // /scorecards documents no maximum, so none is invented here.
  assertEquals(limit?.validation, undefined);
});
