import { pollFromListAction } from "../../_shared/poll/mod.ts";
import inferenceModelList from "../actions/inference-model-list.ts";

export default pollFromListAction({
  key: "new-inference-model",
  title: "New Inference Model",
  description: "The run gets each model newly available from the inference router.",
  action: inferenceModelList,
  input: () => ({}),
  items: (result) => (result as { models?: unknown[] }).models ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Model ID" }],
  sample: { id: "org/model", providers: [{ provider: "provider" }] },
  maxPages: 1,
});
