import { pollFromListAction } from "../../_shared/poll/mod.ts";
import predictionList from "../actions/prediction-list.ts";

export default pollFromListAction({
  key: "new-prediction",
  title: "New Prediction",
  description: "The run gets each newly created prediction.",
  action: predictionList,
  input: () => ({ limit: 100, returnAll: false }),
  items: (result) =>
    Array.isArray(result) ? result : (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Prediction ID" }],
  sample: { id: "prediction-1" },
  maxPages: 1,
});
