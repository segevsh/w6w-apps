import { getAction } from "../lib/factory.ts";

/** `GET /v1.0/categories/{category_id}` */
export default getAction({
  key: "category-get",
  title: "Get Category",
  description: "Get one category by id.",
  resource: "category",
  path: "/categories/{id}",
  idKey: "categoryId",
  idLabel: "Category id",
});
