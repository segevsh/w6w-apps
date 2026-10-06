import { assertEquals, assertRejects } from "@std/assert";
import agentList from "../../actions/agent-list.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("agent-list: GET /api/external/v1/companies/bodyglove/agents/", async () => {
  const body = { agents: [{ pk: 1 }] };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(
    await agentList.execute({ shortname: "bodyglove" }, ctx),
    body,
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/external/v1/companies/bodyglove/agents/");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["x-fareharbor-api-app"], undefined);
});

Deno.test("agent-list: a vendor error surfaces its code and sentence", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody(404, "company-shortname-invalid", "nope is not a valid company shortname"),
  }]);
  await assertRejects(
    async () => await agentList.execute({ shortname: "bodyglove" }, ctx),
    Error,
    "FareHarbor 404 company-shortname-invalid: nope is not a valid company shortname",
  );
});

Deno.test("agent-list: refuses an empty shortname before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await agentList.execute({ ...{ shortname: "bodyglove" }, shortname: " " }, ctx),
    Error,
    "shortname is required",
  );
  assertEquals(calls.length, 0);
});
