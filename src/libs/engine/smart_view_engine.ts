import {LayoutTypes} from "../common/layout_types.enum";
import {Settings} from "@libs/engine/layout_engine/settings";
import {NestedLayoutEngine} from "./layout_engine/linear/hierarchical/specialized/nested_layout_engine";
import {HierarchyLayoutEngine} from "./layout_engine/linear/hierarchical/specialized/hierarchy_layout_engine";
import {SemanticEngine} from "./semantic_engine/semantic_engine";
import {View} from "@libs/model/view";

export interface PathElement {
    identifier: string;
    name: string;
    type: string;
}

export class SmartViewEngine {
    protected settings: Settings;

    constructor(settings: Settings) {
        this.settings = settings;
    }

    generateView(
        paths: Array<Array<PathElement>>,
        title: string
    ): View {
        try {
            let layoutEngine;
            let semanticEngine = new SemanticEngine(paths);

            switch (this.settings.layoutType) {
                case LayoutTypes.NESTED:
                    layoutEngine = new NestedLayoutEngine(this.settings, semanticEngine);
                    break;
                case LayoutTypes.HIERARCHY:
                    layoutEngine = new HierarchyLayoutEngine(this.settings, semanticEngine);
                    break;
                default:
                    layoutEngine = new NestedLayoutEngine(this.settings, semanticEngine);
            }

            semanticEngine.processPaths();

            let view = layoutEngine.convertToView(title || "Unknown");

            layoutEngine.processLayout(view);

            // IMPORTANT: Sorting to put upper level nodes first because of the diagram rendering logic
            view.sortViewNodesParentsFirst();

            return view.getView();
        } catch (e) {
            throw new Error("Unable to render smart view");
        }
    }
}
