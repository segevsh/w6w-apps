import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import getModel from "../../actions/get-model.ts";
import getEndpoint from "../../actions/get-endpoint.ts";

const display = { projectId: "p1", location: "us-central1" };
const BASE = "https://us-central1-aiplatform.googleapis.com/v1/projects/p1/locations/us-central1";

Deno.test("get-model / get-endpoint: bare id uses the connection, full name uses its own region", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }, { body: {} }], { display });
  await getModel.execute!({ modelId: "42" }, ctx);
  await getEndpoint.execute!({ endpointId: "7" }, ctx);
  await getEndpoint.execute!({ endpointId: "projects/p2/locations/europe-west1/endpoints/9" }, ctx);
  assertEquals(calls[0].url, `${BASE}/models/42`);
  assertEquals(calls[1].url, `${BASE}/endpoints/7`);
  assertEquals(
    calls[2].url,
    "https://europe-west1-aiplatform.googleapis.com/v1/projects/p2/locations/europe-west1/endpoints/9",
  );
});
