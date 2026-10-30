import { denoReadTextFile } from "../_deno.ts";
import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhooksList from "../../actions/webhooks-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("webhooks-list: GETs /v3/enterprise/triggers", async () => {
  const body = [{
    id: "t1",
    type: "NewAnnotation",
    webhookURL: "https://host/hook",
    hasAuthorization: true,
  }];
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await webhooksList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v3/enterprise/triggers");
  assertEquals(out, { webhooks: body });
});

test("webhooks-list: never touches the configured authorization header value", async () => {
  const src = await denoReadTextFile(new URL("../../actions/webhooks-list.ts", import.meta.url));
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  assertEquals(/authorization/i.test(code), false);
});
