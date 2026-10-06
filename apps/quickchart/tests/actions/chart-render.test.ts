import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/chart-render.ts";
import { exec, IMG_HEADERS, mockCtx, PNG, SVG } from "../_helpers.ts";

const CHART = '{"type":"bar","data":{"labels":["a"],"datasets":[{"data":[1]}]}}';

Deno.test("chart-render: POSTs /chart with a parsed config and stores the image as a file", async () => {
  const { ctx, calls, created } = mockCtx([{ headers: IMG_HEADERS, body: PNG }], { files: true });
  const out = await exec(action, { chart: CHART, width: 400, version: "4" }, ctx);
  assertEquals(calls[0].url, "https://quickchart.io/chart");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["authorization"], undefined);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.chart.type, "bar");
  assertEquals(sent.width, 400);
  assertEquals(sent.version, "4");
  assertEquals(sent.format, "png");
  assertEquals(sent.height, undefined);
  assertEquals(created[0].filename, "chart.png");
  assertEquals(out.contentType, "image/png");
  assertEquals(out.sizeBytes, PNG.length);
  assertEquals((out.file as { id: string }).id, "ref-1");
  assertEquals(out.base64, undefined);
});

Deno.test("chart-render: a JavaScript-literal config is sent as a string", async () => {
  const { ctx, calls } = mockCtx([{ headers: IMG_HEADERS, body: PNG }]);
  const js = "{type:'bar',options:{x:(v)=>v}}";
  await exec(action, { chart: js }, ctx);
  assertEquals(JSON.parse(calls[0].body!).chart, js);
});

Deno.test("chart-render: svg comes back as text, and base64 when the host has no file store", async () => {
  const { ctx } = mockCtx([{ headers: { "content-type": "image/svg+xml" }, body: SVG }]);
  const out = await exec(action, { chart: CHART, format: "svg" }, ctx);
  assertEquals(out.svg, SVG);
  assertEquals(atob(out.base64), SVG);
});

Deno.test("chart-render: the vendor's X-quickchart-error header becomes the error message", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    headers: { "content-type": "image/png", "x-quickchart-error": "Chart error: bad token" },
    body: PNG,
  }]);
  const err = await assertRejects(() => exec(action, { chart: "{bad" }, ctx));
  assert((err as Error).message.includes("400"));
  assert((err as Error).message.includes("Chart error: bad token"));
});

Deno.test("chart-render: 429 mentions rate limiting and Retry-After", async () => {
  const { ctx } = mockCtx([{ status: 429, headers: { "retry-after": "7" }, body: "slow down" }]);
  const err = await assertRejects(() => exec(action, { chart: CHART }, ctx));
  assert((err as Error).message.includes("rate limited"));
  assert((err as Error).message.includes("7"));
});

Deno.test("chart-render: format=base64 text is decoded into a real PNG file", async () => {
  const b64 = btoa(String.fromCharCode(...PNG));
  const { ctx, created } = mockCtx([{ headers: { "content-type": "text/plain" }, body: b64 }], {
    files: true,
  });
  const out = await exec(action, { chart: CHART, format: "base64" }, ctx);
  assertEquals([...created[0].bytes], [...PNG]);
  assertEquals(out.contentType, "image/png");
});
