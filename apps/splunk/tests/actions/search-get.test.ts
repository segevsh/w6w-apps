import { assertEquals } from "@std/assert";
import { mockSplunkCtx } from "../_helpers.ts";
import action from "../../actions/search-get.ts";

Deno.test("search-get: GETs the job by sid and flattens its content", async () => {
  const { ctx, calls } = mockSplunkCtx([{
    body: {
      entry: [{
        name: "123.45",
        content: { dispatchState: "DONE", isDone: true, resultCount: 10, eventCount: 10 },
      }],
    },
  }]);
  const out = await action.execute({ sid: "123.45" }, ctx);
  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/services/search/jobs/123.45");
  assertEquals(out, {
    sid: "123.45",
    dispatchState: "DONE",
    isDone: true,
    doneProgress: undefined,
    resultCount: 10,
    eventCount: 10,
    runDuration: undefined,
  });
});

Deno.test("search-get: URL-encodes the sid", async () => {
  const { ctx, calls } = mockSplunkCtx([{ body: { entry: [] } }]);
  await action.execute({ sid: "a b" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/services/search/jobs/a%20b");
});
