import action from "../../actions/get-template.ts";
import { testGetById } from "../_shapes.ts";

testGetById("get-template", action, "templateId", "/v1/templates/{id}");
