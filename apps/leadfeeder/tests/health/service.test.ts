import { assertEquals } from "@std/assert";
import service, { mapComponentStatus } from "../../health/service.ts";
import type { HookContext } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";

const page = (apiStatus: string, other = "operational", name = "Leadfeeder") => ({
  page: { id: "hn1yjfj930h5", name },
  components: [
    { id: "t9x0v3jzvfkt", name: "Leadfeeder API", status: apiStatus },
    { id: "z6jbymnsr197", name: "Web Visitors", status: other },
  ],
});
const run = (ctx: HookContext) => service.check!({} as never, ctx);

Deno.test("service: the API component decides; others are capped at degraded", async () => {
  const ok = await run(mockCtx([{ body: page("operational", "major_outage") }]).ctx);
  assertEquals(ok.state, "ok");
  assertEquals(ok.components!["z6jbymnsr197"].state, "degraded");
  assertEquals((await run(mockCtx([{ body: page("major_outage") }]).ctx)).state, "down");
});

Deno.test("service: foreign page, missing component and HTTP failure are unknown", async () => {
  assertEquals(
    (await run(mockCtx([{ body: page("operational", "operational", "Other") }]).ctx)).state,
    "unknown",
  );
  assertEquals(
    (await run(mockCtx([{ body: { page: { name: "Leadfeeder" }, components: [] } }]).ctx)).state,
    "unknown",
  );
  assertEquals((await run(mockCtx([{ status: 500, body: "x" }]).ctx)).state, "unknown");
  assertEquals((await run(mockCtx([{ body: "not json{" }]).ctx)).state, "unknown");
});

Deno.test("service: component status mapping", () => {
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("weird"), "unknown");
});
