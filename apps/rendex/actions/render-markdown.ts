import { renderAction } from "../lib/render.ts";

/** Markdown (optionally a Mustache template) to image/PDF via `POST /v1/screenshot/json`. */
export default renderAction("markdown");
