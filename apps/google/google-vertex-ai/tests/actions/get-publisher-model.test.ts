import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import getPublisher from "../../actions/get-publisher-model.ts";

const display = { projectId: "p1", location: "europe-west4" };

Deno.test("get-publisher-model: GETs the global, project-less path", async () => {
  const { ctx, calls } = mockCtx(
    [{ body: { name: "publishers/google/models/gemini-2.5-flash" } }],
    { display },
  );
  await getPublisher.execute!({ model: "gemini-2.5-flash" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash",
  );
  await assertRejects(
    () => Promise.resolve(getPublisher.execute!({ model: "../x" }, ctx)),
    Error,
    "not a valid id",
  );
});
