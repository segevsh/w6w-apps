import { listAction } from "../lib/rows.ts";

export default listAction({
  key: "genre-types-list",
  title: "List genre types",
  resource: "genreTypes",
  whereType: "GenreTypeWhereInput",
  fields: "id name",
  filters: [],
});
