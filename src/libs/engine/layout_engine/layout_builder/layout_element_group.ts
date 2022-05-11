import {Alignment} from "@libs/common/alignment.enum";
import {Settings} from "@libs/engine/layout_engine/settings";
import {BaseElement} from "@libs/model/base_element";

const uniqId = require('uniqid');

export class LayoutElementGroup {
    protected id: string;
    protected parentId: string;
    protected settings: Settings;
    protected mainAxisAlignment: Alignment;
    protected crossAxisAlignment: Alignment;
    protected withoutMargin: boolean;
    protected children: any[];
    protected x: number;
    protected y: number;
    protected mainLength: number;
    protected crossLength: number;
    protected virtualMainLength: number;
    protected sizeReference: number;
    protected maxChildSize: number;
    protected subTreeCounting: number;
    protected hasNestedGroup: boolean;

    constructor(
        mainAxisAlignment: Alignment,
        crossAxisAlignment: Alignment,
        settings: Settings,
        parentId: string,
        withoutMargin: boolean
    ) {
        this.id = uniqId();
        this.parentId = parentId;
        this.settings = settings;
        this.mainAxisAlignment = mainAxisAlignment;
        this.crossAxisAlignment = crossAxisAlignment;
        this.withoutMargin = withoutMargin;
        this.children = [];
        this.x = 0;
        this.y = 0;
        this.mainLength = 0; // Not the length of Children, but refers to the real size (in points) of the group
        this.crossLength = 0;
        this.virtualMainLength = 0; // Related to arbitrary group's Main Length
        this.sizeReference = 0; // Represents the size of each element (without padding between) that fulfill the group length
        this.maxChildSize = 0; // Represents the size of the biggest child (related to the main length)
        this.subTreeCounting = -1; // Total number of elements inside the subtree formed by its children. Starts with -1 to not consider the element itself
        this.hasNestedGroup = false; // Indicates if the element has as child another LayoutElementGroup
    }

    getId() {
        return this.id;
    }

    getParentId() {
        return this.parentId;
    }

    getSubTreeCounting() {
        return this.subTreeCounting;
    }

    isEmpty(): boolean {
        return this.children.length === 0;
    }

    getChildAtIndex(index: number) {
        if (this.children.length > index) {
            return this.children[index];
        }
    }

    addContainer(container: object) {
        if (container) {
            this.children.push(container);

            this.hasNestedGroup = this.hasNestedGroup || container instanceof LayoutElementGroup;
        }
    }

    incrementSubTreeCounting() {
        this.subTreeCounting++;
    }

    /**
     * Updates the size of the element based on it`s content, considering children`s width and height
     * @param getMainLengthIncrement
     * @param getCrossLengthIncrement
     */
    adjustDimensionsToChildren(
        getMainLengthIncrement: (child: BaseElement | LayoutElementGroup) => number,
        getCrossLengthIncrement: (child: BaseElement | LayoutElementGroup) => number
    ) {
        let notEmptyChildCount = 0;
        this.resetElementLength();

        for (let i = 0; i < this.children.length; i++) {
            const child = this.children[i];
            const mainLengthIncrement = getMainLengthIncrement(child);
            const crossLengthIncrement = getCrossLengthIncrement(child);

            // Counting just not empty child (with elements below in the hierarchy)
            if (mainLengthIncrement > 0) {
                this.incrementMainLength(mainLengthIncrement);

                notEmptyChildCount++;
            }

            // Updating cross length if needed
            if (crossLengthIncrement > this.crossLength) {
                this.crossLength = crossLengthIncrement;
            }
        }

        // Adding space between
        if (notEmptyChildCount > 0) {
            const spaceBetweenTotalIncrement = (notEmptyChildCount - 1) * this.settings.spaceBetween;

            this.incrementMainLength(spaceBetweenTotalIncrement);
        }

        // Replacing virtualLength if needed
        if (this.mainLength > this.virtualMainLength) {
            this.virtualMainLength = this.mainLength;
        }
    }

    /**
     * Applies translation over the position of the element
     * @param deltaX
     * @param deltaY
     */
    translateElementGroupPosition(deltaX: number, deltaY: number) {
        const newX = this.getX() + deltaX;
        const newY = this.getY() + deltaY;

        this.setX(newX);
        this.setY(newY);
    }

    /**
     * Applies translation over the position of the element and it's nested children
     * @param deltaX
     * @param deltaY
     */
    translatePosition(deltaX: number, deltaY: number) {
        const marginX = this.withoutMargin ? 0 : this.settings.marginX;
        const marginY = this.withoutMargin ? 0 : this.settings.marginY;

        this.translateElementGroupPosition(deltaX, deltaY);

        for (let i = 0; i < this.children.length; i++) {
            const child = this.children[i];

            child.translatePosition(this.getX() + marginX, this.getY() + marginY);
        }
    }

    setX(value: number) {
        this.x = value;
    }

    setY(value: number) {
        this.y = value;
    }

    getX() {
        return this.x;
    }

    getY() {
        return this.y;
    }

    resetElementLength() {
        this.mainLength = 0;
        this.crossLength = 0;
    }

    incrementMainLength(value: number) {
        this.mainLength += value;

        if (this.mainLength > this.virtualMainLength) {
            this.virtualMainLength = this.mainLength;
        }

        // Updating maximum element main length size
        if (value > this.maxChildSize) {
            this.maxChildSize = value;
        }

        this.updateSizeReference();
    }

    setMaximumCrossLength(value: number) {
        if (value > this.crossLength) {
            this.crossLength = value;
        }
    }

    setMaximumMainLength(value: number) {
        if (value > this.mainLength) {
            this.virtualMainLength = value;

            this.updateSizeReference();
        }
    }

    updateSizeReference() {
        const virtualLengthWithoutPadding = this.virtualMainLength - ((this.children.length - 1) * this.getOptimalPadding());
        const potentialOptimalSize = virtualLengthWithoutPadding / this.children.length;

        if (potentialOptimalSize <= this.maxChildSize && this.hasNestedGroup) {
            this.sizeReference = this.maxChildSize;
        } else {
            this.sizeReference = potentialOptimalSize;
        }
    }

    getMainLength(virtual: boolean) {
        return virtual ? this.virtualMainLength : this.mainLength;
    }

    getCrossLength() {
        return this.crossLength;
    }

    getChildrenLength() {
        return this.children.length;
    }

    getChildren() {
        return this.children;
    }

    /**
     * Based on alignment, returns the optimal element size to fulfill the main axis in a balanced manner
     * @returns {number}
     */
    getOptimalSize() {
        return this.sizeReference;
    }

    getOptimalPadding() {
        return this.settings.spaceBetween;
    }

    /**
     * Based on alignment, returns the optimal start position for children
     * @returns {number}
     */
    getOptimalStartPosition() {
        if (this.mainAxisAlignment === Alignment.END) {
            return this.virtualMainLength;
        } else if (this.mainAxisAlignment === Alignment.CENTER) {
            const centerPoint = this.virtualMainLength / 2;
            return centerPoint - this.mainLength / 2;
        } else {
            return 0;
        }
    }

    // TODO: Calculate total width
    getWidth(): number {
        return 0;
    };

    // TODO: Calculate total height
    getHeight(): number {
        return 0;
    };

    applyDistribution(): void {}
}