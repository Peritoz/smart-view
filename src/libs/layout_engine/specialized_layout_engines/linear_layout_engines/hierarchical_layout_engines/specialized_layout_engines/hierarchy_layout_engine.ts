import {SIZE_REFERENCE} from "@libs/common/size_reference.const";
import {SemanticEngine} from "@libs/semantic_engine/semantic_engine";
import {LayoutSettings} from "@libs/layout_engine/settings";
import {HydratedViewNode, View} from "@libs/view_factory/view";
import {HierarchicalLayoutEngine} from "../hierarchical_layout_engine";
import {PlotCursor} from "../../../../plot_cursor";

class HierarchyLayoutEngine extends HierarchicalLayoutEngine {
    constructor(settings: LayoutSettings, semanticEngine: SemanticEngine) {
        super(settings, semanticEngine);
    }

    processLayout(view: View) {
        // Generating a tree of nested elements
        let nestedTree = this.groupParentNodes(view.getViewNodes());

        // Processing element width and height
        let bounds = this.processDimensionsByContent(nestedTree, null, this.maxHorizontalCount);

        // Setting the "paper" dimension
        view.setBounds(bounds.width, bounds.height);

        // Rendering element positions
        this.renderRows(nestedTree, 0, this.maxHorizontalCount, SIZE_REFERENCE.PADDING_X, SIZE_REFERENCE.PADDING_Y);
    }

    /**
     * Calculates the dimensions of each element of the nested tree
     * @param nestedSubTree Tree organizing all nested elements
     * @param parentNode
     * @param maxColumns
     * @returns Element dimensions as {width: #, height: #}
     */
    protected processDimensionsByContent(
        nestedSubTree: Array<HydratedViewNode>,
        parentNode: HydratedViewNode | null,
        maxColumns: number
    ) {
        let sortedNestedTree = nestedSubTree.sort((a, b) => b.nestedCount - a.nestedCount);

        let result = {
            width: 0,
            height: SIZE_REFERENCE.INNER_TOP_PADDING_Y,
            verticalCoverage: SIZE_REFERENCE.INNER_TOP_PADDING_Y,
            maxColumnCount: 0
        };
        let cursorX = 0;
        let columnCount = 0;
        let rowHeight = 0;

        for (let i = 0; i < sortedNestedTree.length; i++) {
            let node = sortedNestedTree[i];
            let nestedDimensions;

            if (node.children.length > 0) { // It is not a leaf
                let maxColumnsConstraint = node.nestedCount > maxColumns ? maxColumns - columnCount : this.maxChildHorizontalCount;

                nestedDimensions = this.processDimensionsByContent(node.children, node, maxColumnsConstraint);
                columnCount += nestedDimensions.maxColumnCount;
            } else { // It's a leaf
                nestedDimensions = {
                    width: SIZE_REFERENCE.DEFAULT_WIDTH,
                    height: SIZE_REFERENCE.DEFAULT_HEIGHT,
                    verticalCoverage: SIZE_REFERENCE.DEFAULT_HEIGHT
                };
                columnCount++;
            }

            // Setting the maximum value of column count
            if (columnCount > result.maxColumnCount) {
                result.maxColumnCount = columnCount;
            }

            // Incrementing horizontal cursor
            cursorX += nestedDimensions.width;

            if (cursorX > result.width) {
                result.width = cursorX;
            }

            // Setting the current node dimensions
            node.width = nestedDimensions.width;
            node.verticalCoverage = nestedDimensions.verticalCoverage;

            if (nestedDimensions.verticalCoverage + SIZE_REFERENCE.PADDING_Y > rowHeight) {
                rowHeight = nestedDimensions.verticalCoverage + SIZE_REFERENCE.PADDING_Y;
            }

            // Row break (new row) or last element (final row)
            if ((columnCount >= maxColumns) || i === sortedNestedTree.length - 1) {
                result.verticalCoverage += rowHeight;

                cursorX = 0;
                columnCount = 0;
                rowHeight = 0;
            } else {
                // Incrementing horizontal cursor
                cursorX += SIZE_REFERENCE.MARGIN_X;
            }
        }

        // Adding final padding
        result.verticalCoverage += SIZE_REFERENCE.INNER_BOTTOM_PADDING_Y;

        return result;
    }

    renderRows(
        nestedTree: Array<HydratedViewNode>,
        index: number,
        maxColumns: number,
        initialX: number,
        initialY: number
    ) {
        const elementSizeReference = SIZE_REFERENCE.DEFAULT_WIDTH + 2 * SIZE_REFERENCE.MARGIN_X;
        let sortedNestedTree = nestedTree.sort((a, b) => b.nestedCount - a.nestedCount);
        let cursor = new PlotCursor(initialX, initialY, maxColumns * elementSizeReference, 100000, {
            leftPadding: 0,
            rightPadding: SIZE_REFERENCE.MARGIN_X,
            topPadding: 0,
            bottomPadding: SIZE_REFERENCE.MARGIN_Y
        });
        let maxColumnCount = 0;
        let maxHeight = 0;
        let maxWidth = 0;
        let columnCount = 0;

        for (let i = 0; i < sortedNestedTree.length; i++) {
            let node = sortedNestedTree[i];
            const hierarchyDepth = Math.ceil(node.children.length / this.maxHorizontalCount);

            let position = cursor.calculatePosition(
                {
                    width: node.width,
                    height: node.height + hierarchyDepth * (SIZE_REFERENCE.DEFAULT_HEIGHT + SIZE_REFERENCE.MARGIN_Y)
                }
            );

            node.x = position.x;
            node.y = position.y;

            if (node.children.length > 0) { // It is not a leaf
                let maxColumnsConstraint = node.nestedCount > maxColumns ? maxColumns - columnCount : this.maxChildHorizontalCount;
                let nestedPositionResult = this.renderRows(node.children, i, maxColumnsConstraint, 0, node.height + SIZE_REFERENCE.MARGIN_Y);

                columnCount += nestedPositionResult.maxColumnCount;
            } else { // It's a leaf
                columnCount++;
            }
        }

        return {maxColumnCount, maxWidth, maxHeight};
    }
}

module.exports = HierarchyLayoutEngine;