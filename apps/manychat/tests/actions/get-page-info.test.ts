import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import getPageInfo from "../../actions/get-page-info.ts";

Deno.test("get-page-info: GETs the parameterless page endpoint", async () => {
  const { ctx, calls } = mockCtx([
    { body: { status: "success", data: { id: 1, name: "Acme", is_pro: true } } },
  ]);
  await getPageInfo.execute!({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.manychat.com/fb/page/getInfo");
});

Deno.test("get-page-info: declares no params — the token selects the page", () => {
  assertEquals(getPageInfo.params, []);
});

Deno.test("get-page-info: returns the envelope whole", async () => {
  const { ctx } = mockCtx([
    { body: { status: "success", data: { id: 1, name: "Acme", timezone: "UTC+02:00" } } },
  ]);
  const out = await getPageInfo.execute!({}, ctx) as {
    status: string;
    data: { name: string; timezone: string };
  };
  assertEquals(out.status, "success");
  assertEquals(out.data.name, "Acme");
  assertEquals(out.data.timezone, "UTC+02:00");
});
