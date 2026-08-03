import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/response-list.ts";

Deno.test("response-list: GET /v1/forms/{formId}/responses with no filter by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { responses: [] } }]);
  const result = await action.execute({ formId: "f1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/v1/forms/f1/responses");
  assertEquals(url.searchParams.has("filter"), false);
  assertEquals(result, { responses: [] });
});

Deno.test("response-list: submittedAfter builds the `timestamp >` filter", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ formId: "f1", submittedAfter: "2014-10-02T15:01:23Z" }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.get("filter"),
    "timestamp > 2014-10-02T15:01:23Z",
  );
});

Deno.test("response-list: an explicit filter wins over submittedAfter", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    formId: "f1",
    filter: "timestamp >= 2020-01-01T00:00:00Z",
    submittedAfter: "2014-10-02T15:01:23Z",
  }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.get("filter"),
    "timestamp >= 2020-01-01T00:00:00Z",
  );
});

Deno.test("response-list: forwards pageSize and pageToken", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ formId: "f1", pageSize: 50, pageToken: "tok" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("pageSize"), "50");
  assertEquals(url.searchParams.get("pageToken"), "tok");
});
