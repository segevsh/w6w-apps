import { assert, assertEquals } from "@std/assert";
import resultList from "../../actions/result-list.ts";
import { mockCtx, page, queryOf } from "../_helpers.ts";

Deno.test("result-list: reads the documented results path for the given scorecard", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);

  await resultList.execute({ scorecard: "1" }, ctx);

  assertEquals(calls[0].url.split("?")[0], "https://open-api.scoreapp.com/scorecards/1/results");
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("result-list: the paginated envelope comes back verbatim", async () => {
  const body = page([{ id: "2756c677", status: "finished", email: "john@example.com" }]);
  const { ctx } = mockCtx([{ body }]);

  assertEquals(await resultList.execute({ scorecard: "1" }, ctx), body as never);
});

Deno.test("result-list: every documented filter is forwarded under its own snake_case name", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);

  await resultList.execute(
    {
      scorecard: "1",
      limit: 50,
      search: "john",
      from_date: "2024-01-01T00:00:00Z",
      to_date: "2024-01-31T23:59:59Z",
      status: "finished",
      response_count: "single",
      order_by: "created_at",
      order_dir: "desc",
    },
    ctx,
  );

  assertEquals(queryOf(calls[0].url), {
    limit: "50",
    search: "john",
    from_date: "2024-01-01T00:00:00Z",
    to_date: "2024-01-31T23:59:59Z",
    status: "finished",
    response_count: "single",
    order_by: "created_at",
    order_dir: "desc",
  });
});

Deno.test("result-list: the scorecard id is required, the filters are not", () => {
  const required = (resultList.params ?? []).filter((p) => p.required === true).map((p) => p.key);

  assertEquals(required, ["scorecard"]);
  assertEquals(resultList.type, "search");
  assertEquals(resultList.resource, "result");
});

/** The vendor caps `limit` at 100 here, and states no cap on /scorecards. */
Deno.test("result-list: the page size carries the documented 100 maximum", () => {
  const limit = resultList.params?.find((p) => p.key === "limit");

  assertEquals(limit?.validation, { integer: true, min: 1, max: 100 });
  assert(/maximum/.test(limit?.hint ?? ""), limit?.hint);
});

Deno.test("result-list: the filter enums are the documented ones", () => {
  const valuesOf = (key: string) =>
    ((resultList.params?.find((p) => p.key === key)?.options ?? []) as Array<{ value: string }>)
      .map((o) => o.value);

  assertEquals(valuesOf("status"), ["started", "finished"]);
  assertEquals(valuesOf("response_count"), ["single", "multiple"]);
  assertEquals(valuesOf("order_by"), ["first_name", "last_name", "email", "created_at", "id"]);
  assertEquals(valuesOf("order_dir"), ["asc", "desc"]);
});

/** The date filters are ISO UTC datetimes, not dates. */
Deno.test("result-list: the date filters are datetime params", () => {
  assertEquals(resultList.params?.find((p) => p.key === "from_date")?.type, "datetime");
  assertEquals(resultList.params?.find((p) => p.key === "to_date")?.type, "datetime");
});
