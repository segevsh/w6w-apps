import { assert, assertEquals, assertRejects } from "@std/assert";
import projectGet from "../../actions/project-get.ts";
import { errorBody, mockCtx } from "../_helpers.ts";

Deno.test("project-get: GETs /v1/ and returns the environment", async () => {
  const body = {
    project_uuid: "p-1",
    project_name: "Production",
    message: "Authentication successful",
  };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await projectGet.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.refiner.io/v1/");
  assertEquals(out, body);
});

Deno.test("project-get: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("API key does not look valid") }]);
  const err = await assertRejects(
    () => Promise.resolve(projectGet.execute({}, ctx)),
    Error,
  );
  assert(err.message.includes("API key does not look valid"), err.message);
  assert(err.message.includes("401"), err.message);
});
