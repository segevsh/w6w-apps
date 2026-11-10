import { newOrder } from "../lib/triggers.ts";

// The key is repeated here so the row `covers` (order-search) can name this file.
export default { ...newOrder, key: "new-order" };
