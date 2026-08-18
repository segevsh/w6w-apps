import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/dataset-create.ts";

const display = { projectId: "p1" };

Deno.test("dataset-create: POSTs a qualified dataset reference", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "p1:sales" } }], { display });
  await action.execute!({ datasetId: "sales", location: "EU" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/bigquery/v2/projects/p1/datasets");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.datasetReference, { projectId: "p1", datasetId: "sales" });
  assertEquals(body.location, "EU");
});

Deno.test("dataset-create: unset optional fields are omitted, not sent empty", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({ datasetId: "sales", location: "", description: "" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.location, undefined);
  assertEquals(body.description, undefined);
});

Deno.test("dataset-create: labels arrive as JSON and bad JSON is named", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({ datasetId: "sales", labels: '{"team":"analytics"}' }, ctx);
  assertEquals(JSON.parse(calls[0].body!).labels, { team: "analytics" });

  const bad = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ datasetId: "sales", labels: "{oops" }, bad.ctx),
    Error,
    "`labels` is not valid JSON",
  );
  assertEquals(bad.calls.length, 0);
});

/** Location cannot be changed later, so the hint has to say so up front. */
Deno.test("dataset-create: the location param warns that it is immutable", () => {
  const location = action.params!.find((p) => p.key === "location")!;
  assert(location.hint!.includes("IMMUTABLE"), location.hint);
  assertEquals(action.idempotent, false);
});

Deno.test("dataset-create: a blank dataset id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`datasetId`");
  assertEquals(calls.length, 0);
});
