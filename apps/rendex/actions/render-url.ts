import { renderAction } from "../lib/render.ts";

/** Screenshot or PDF of a public URL via `POST /v1/screenshot/json`. See `lib/render.ts`. */
export default renderAction("url");
