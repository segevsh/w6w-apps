import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import listFlows from "../../actions/list-flows.ts";

const OK = {
  body: {
    status: "success",
    data: {
      flows: [{ ns: "content20260803120000_123456", name: "Welcome", folder_id: 1 }],
      folders: [{ id: 1, name: "Onboarding", parent_id: 0 }],
    },
  },
};

Deno.test("list-flows: GETs the flows endpoint", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await listFlows.execute!({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.manychat.com/fb/page/getFlows");
});

Deno.test("list-flows: data carries BOTH flows and folders, unlike other list endpoints", async () => {
  const { ctx } = mockCtx([OK]);
  const out = await listFlows.execute!({}, ctx) as {
    data: { flows: unknown[]; folders: unknown[] };
  };
  assertEquals(Object.keys(out.data).sort(), ["flows", "folders"]);
});

Deno.test("list-flows: a flow's id is the opaque `ns` string that Send Flow takes", async () => {
  const { ctx } = mockCtx([OK]);
  const out = await listFlows.execute!({}, ctx) as { data: { flows: Array<{ ns: string }> } };
  assertEquals(typeof out.data.flows[0].ns, "string");
});
