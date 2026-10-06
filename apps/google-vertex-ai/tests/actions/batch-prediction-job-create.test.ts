import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import jobCreate from "../../actions/batch-prediction-job-create.ts";

const display = { projectId: "p1", location: "us-central1" };
const BASE = "https://us-central1-aiplatform.googleapis.com/v1/projects/p1/locations/us-central1";

Deno.test("batch-prediction-job-create: GCS jsonl in, GCS out", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "n", state: "JOB_STATE_PENDING" } }], {
    display,
  });
  const out = await jobCreate.execute!({
    displayName: "nightly",
    model: "publishers/google/models/gemini-2.5-flash",
    instancesFormat: "jsonl",
    inputUris: ["gs://b/in.jsonl"],
    predictionsFormat: "jsonl",
    outputUri: "gs://b/out/",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${BASE}/batchPredictionJobs`);
  assertEquals(JSON.parse(calls[0].body!), {
    displayName: "nightly",
    model: "publishers/google/models/gemini-2.5-flash",
    inputConfig: { instancesFormat: "jsonl", gcsSource: { uris: ["gs://b/in.jsonl"] } },
    outputConfig: {
      predictionsFormat: "jsonl",
      gcsDestination: { outputUriPrefix: "gs://b/out/" },
    },
  });
  assertEquals(out, { name: "n", state: "JOB_STATE_PENDING" });
});

Deno.test("batch-prediction-job-create: BigQuery in and out, and the required inputs", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await jobCreate.execute!({
    displayName: "bq",
    model: "projects/p1/locations/us-central1/models/5",
    instancesFormat: "bigquery",
    inputUris: ["bq://p1.d.t"],
    predictionsFormat: "bigquery",
    outputUri: "bq://p1",
    labels: '{"team":"ml"}',
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.inputConfig, {
    instancesFormat: "bigquery",
    bigquerySource: { inputUri: "bq://p1.d.t" },
  });
  assertEquals(body.outputConfig, {
    predictionsFormat: "bigquery",
    bigqueryDestination: { outputUri: "bq://p1" },
  });
  assertEquals(body.labels, { team: "ml" });
  const base = {
    displayName: "x",
    model: "m",
    instancesFormat: "jsonl",
    predictionsFormat: "jsonl",
  };
  await assertRejects(
    () => Promise.resolve(jobCreate.execute!({ ...base, outputUri: "gs://o/" }, ctx)),
    Error,
    "inputUris",
  );
  await assertRejects(
    () => Promise.resolve(jobCreate.execute!({ ...base, inputUris: ["gs://i"] }, ctx)),
    Error,
    "outputUri",
  );
  await assertRejects(
    () =>
      Promise.resolve(
        jobCreate.execute!({
          ...base,
          displayName: "",
          inputUris: ["gs://i"],
          outputUri: "gs://o/",
        }, ctx),
      ),
    Error,
    "displayName",
  );
});
