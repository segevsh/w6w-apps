import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-application.ts";

Deno.test("get-application: GETs /applications/{objectId} by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "a1", appId: "c1" } }]);
  const out = await action.execute({ applicationId: "a1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/applications/a1");
  assertEquals(out.appId, "c1");
});

Deno.test("get-application: addresses by client id with the documented appId form", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { applicationId: "c1", idType: "appId", select: ["id", "keyCredentials"] },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(decodeURIComponent(url.pathname), "/v1.0/applications(appId='c1')");
  assertEquals(url.searchParams.get("$select"), "id,keyCredentials");
});

Deno.test("get-application: requires an id", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ applicationId: "" }, ctx),
    Error,
    "required",
  );
  assertEquals(calls.length, 0);
});
