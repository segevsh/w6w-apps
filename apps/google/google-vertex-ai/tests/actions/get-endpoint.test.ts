import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-endpoint.ts";

const display = { projectId: "p1", location: "us-central1" };

Deno.test("get-endpoint: GETs the endpoint with its deployed models intact", async () => {
  const body = { name: "e", deployedModels: [{ id: "d1" }], trafficSplit: { d1: 100 } };
  const { ctx, calls } = mockCtx([{ body }], { display });
  const out = await action.execute!({ endpointId: "7" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://us-central1-aiplatform.googleapis.com/v1/projects/p1/locations/us-central1/endpoints/7",
  );
  assertEquals(out, body);
});

Deno.test("get-endpoint: a model's full name is refused (wrong collection)", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    () =>
      Promise.resolve(
        action.execute!({ endpointId: "projects/p1/locations/us-central1/models/1" }, ctx),
      ),
    Error,
    'expected "endpoints"',
  );
  assertEquals(calls.length, 0);
  assert(action.params!.some((p) => p.key === "endpointId" && p.required));
});
