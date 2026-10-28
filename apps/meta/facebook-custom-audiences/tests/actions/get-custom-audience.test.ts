import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-custom-audience.ts";

Deno.test("get-custom-audience: GET /<id> with the default field list", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "77", name: "VIPs" } }]);
  const out = await action.execute({ audienceId: "77" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v25.0/77");
  assert(url.searchParams.get("fields")!.includes("delivery_status"));
  assertEquals(out.name, "VIPs");
});

Deno.test("get-custom-audience: honours an explicit field list; reports Meta's error", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: "77" } },
    { status: 403, body: { error: { message: "(#200) Permissions error", code: 200 } } },
  ]);
  await action.execute({ audienceId: "77", fields: "id,name" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("fields"), "id,name");
  await assertRejects(
    () => Promise.resolve(action.execute({ audienceId: "77" }, ctx)),
    Error,
    "Permissions error",
  );
});
