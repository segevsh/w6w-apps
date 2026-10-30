import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockJsmCtx } from "../_helpers.ts";
import action from "../../actions/request-search.ts";

test("request-search: GETs /request with pagination defaults", async () => {
  const { ctx, calls } = mockJsmCtx([{ body: { values: [] } }]);
  await action.execute({}, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.atlassian.net/rest/servicedeskapi/request?start=0&limit=50",
  );
});

test("request-search: forwards filters when set", async () => {
  const { ctx, calls } = mockJsmCtx([{ body: {} }]);
  await action.execute(
    { searchTerm: "mouse", requestStatus: "OPEN_REQUESTS", serviceDeskId: "10" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("searchTerm"), "mouse");
  assertEquals(url.searchParams.get("requestStatus"), "OPEN_REQUESTS");
  assertEquals(url.searchParams.get("serviceDeskId"), "10");
});
