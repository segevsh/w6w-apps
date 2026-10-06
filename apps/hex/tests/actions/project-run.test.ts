import { assertEquals, assertRejects } from "@std/assert";
import projectRun from "../../actions/project-run.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

const handle = {
  projectId: "p1",
  runId: "r1",
  runUrl: "https://app.hex.tech/x",
  runStatusUrl: "https://app.hex.tech/api/v1/projects/p1/runs/r1",
  traceId: "t",
  projectVersion: 3,
};

Deno.test("project-run: POSTs {} when nothing is set, so Hex's defaults apply", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: handle }]);
  const out = await projectRun.execute({ projectId: "p1" }, ctx) as typeof handle;
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/projects/p1/runs");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {});
  assertEquals(out.runId, "r1");
});

Deno.test("project-run: sends the new parameter pair, never the deprecated updateCache", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: handle }]);
  await projectRun.execute({
    projectId: "p1",
    inputParams: { region: "emea" },
    updatePublishedResults: true,
    useCachedSqlResults: false,
    dryRun: false,
    viewId: "v1",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, {
    inputParams: { region: "emea" },
    updatePublishedResults: true,
    useCachedSqlResults: false,
    dryRun: false,
    viewId: "v1",
  });
  assertEquals("updateCache" in body, false);
});

Deno.test("project-run: JSON-string inputParams and notifications are parsed", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: handle }]);
  await projectRun.execute({
    projectId: "p1",
    inputParams: '{"n":1}',
    notifications: '[{"type":"FAILURE","includeSuccessScreenshot":false}]',
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    inputParams: { n: 1 },
    notifications: [{ type: "FAILURE", includeSuccessScreenshot: false }],
  });
});

Deno.test("project-run: malformed JSON fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(projectRun.execute({ projectId: "p1", inputParams: "{nope" }, ctx)),
    Error,
    "Input parameters is not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("project-run: a 422 surfaces the vendor's code", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorBody("UNPROCESSABLE_CONTENT", "Not published"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(projectRun.execute({ projectId: "p1" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("UNPROCESSABLE_CONTENT"), true);
});

Deno.test("project-run: is not idempotent", () => {
  assertEquals(projectRun.idempotent, false);
});
