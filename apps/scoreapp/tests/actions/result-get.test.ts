import { assert, assertEquals } from "@std/assert";
import resultGet from "../../actions/result-get.ts";
import { mockCtx, pathOf, queryOf, queryValuesOf } from "../_helpers.ts";

Deno.test("result-get: reads the documented single-result path", async () => {
  const body = { data: { id: "2756c677", status: "finished" } };
  const { ctx, calls } = mockCtx([{ body }]);

  const result = await resultGet.execute({ scorecard: "1", result: "123" }, ctx);

  assertEquals(pathOf(calls[0].url), "/scorecards/1/results/123");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(result, body as never);
});

Deno.test("result-get: both ids are passed through uncoerced", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);

  await resultGet.execute(
    { scorecard: "9e01daab-49c6-428b-9209-b5b0607acad3", result: "abc-def" },
    ctx,
  );

  assertEquals(
    pathOf(calls[0].url),
    "/scorecards/9e01daab-49c6-428b-9209-b5b0607acad3/results/abc-def",
  );
});

/**
 * `include[]` is a repeated key, the vendor's own documented form
 * (`?include[]=answers&include[]=scores`) — never one comma-joined value.
 */
Deno.test("result-get: includes are sent as repeated include[] keys", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);

  await resultGet.execute({ scorecard: "1", result: "123", include: ["answers", "scores"] }, ctx);

  assertEquals(queryValuesOf(calls[0].url, "include[]"), ["answers", "scores"]);
  assertEquals(calls[0].url.includes("answers,scores"), false, calls[0].url);
});

Deno.test("result-get: an empty include list sends no include parameter at all", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);

  await resultGet.execute({ scorecard: "1", result: "123", include: [] }, ctx);

  assertEquals(queryValuesOf(calls[0].url, "include[]"), []);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("result-get: the include options are exactly the five the article documents", () => {
  const include = resultGet.params?.find((p) => p.key === "include");

  assertEquals(include?.type, "multiselect");
  assertEquals(
    (include?.options as Array<{ value: string }>).map((o) => o.value),
    ["answers", "scores", "source", "activity", "additional_data"],
  );
  // The one Pro-plan-only include says so where the user chooses it.
  const additional = (include?.options as Array<{ value: string; description?: string }>).find(
    (o) => o.value === "additional_data",
  );
  assert(/Pro plan/.test(additional?.description ?? ""), additional?.description);
});

Deno.test("result-get: both path ids are required string params", () => {
  for (const key of ["scorecard", "result"]) {
    const param = resultGet.params?.find((p) => p.key === key);
    assertEquals(param?.type, "string", key);
    assertEquals(param?.required, true, key);
  }
});
