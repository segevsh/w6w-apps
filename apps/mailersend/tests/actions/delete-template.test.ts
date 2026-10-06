import action from "../../actions/delete-template.ts";
import { testDeleteById } from "../_shapes.ts";

testDeleteById("delete-template", action, "templateId", "/v1/templates/{id}", 200);
