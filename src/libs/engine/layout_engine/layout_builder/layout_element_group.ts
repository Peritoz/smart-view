import { Alignment } from "@libs/common/alignment.enum";
import { Settings } from "@libs/engine/layout_engine/settings";
import { BaseElement } from "@libs/model/base_element";
import { Direction } from "@libs/common/distribution.enum";

const uniqId = require("uniqid");

interface Point {
  x: number;
  y: number;
}

export class LayoutElementGroup {
  protected id: string;
  protected parentId: string | null;
  protected settings: Settings;
  protected horizontalAlignment: Alignment;
  protected verticalAlignment: Alignment;
  protected children: Array<LayoutElementGroup | BaseElement>;
  protected x: number;
  protected y: number;
  protected childrenDirection: Direction;
  protected usedWidth: number;
  protected usedHeight: number;
  protected width: number;
  protected height: number;
  protected contentBox: { topLeft: Point; bottomRight: Point };
  protected sizeReference: number;
  protected maxChildWidth: number;
  protected maxChildHeight: number;
  protected subTreeCounting: number;
  protected hasNestedGroup: boolean;

  constructor(
    horizontalAlignment: Alignment,
    verticalAlignment: Alignment,
    distribution: Direction,
    settings: Settings,
    parentId: string | null
  ) {
    this.id = uniqId();
    this.parentId = parentId;
    this.settings = settings;
    this.horizontalAlignment = horizontalAlignment;
    this.verticalAlignment = verticalAlignment;
    this.children = [];
    this.x = 0;
    this.y = 0;
    this.childrenDirection = distribution;
    this.usedWidth = 0; // Not the length of Children, but refers to the real width (in points) of the group
    this.usedHeight = 0; // Not the length of Children, but refers to the real height (in points) of the group
    this.width = 0; // Related to arbitrary (non derived from children dimensions) group's Main Length
    this.height = 0; // Related to arbitrary (non derived from children dimensions) group's Cross Length
    this.contentBox = { topLeft: { x: 0, y: 0 }, bottomRight: { x: 0, y: 0 } }; // Content box limits
    this.sizeReference = 0; // Represents the size of each element (without padding between) that fulfill the group length
    this.maxChildWidth = 0; // Represents the width of the biggest child
    this.maxChildHeight = 0; // Represents the height of the biggest child
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

  getUsedWidth() {
    return this.usedWidth;
  }

  getUsedHeight() {
    return this.usedHeight;
  }

  getChildrenLength() {
    return this.children.length;
  }

  getChildren() {
    return this.children;
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

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  setWidth(value: number) {
    if (value > this.width) {
      this.width = value;

      // Updating content box limit
      this.updateHorizontalContentBoxAxis();

      // Updating reference element size
      this.updateSizeReference();
    } else {
      throw new Error("The new Width can´t be smaller than current Width");
    }
  }

  setHeight(value: number) {
    if (value > this.height) {
      this.height = value;

      // Updating content box limit
      this.updateVerticalContentBoxAxis();

      // Updating reference element size
      this.updateSizeReference();
    } else {
      throw new Error("The new Height can´t be smaller than current Height");
    }
  }

  updateHorizontalContentBoxAxis() {
    this.contentBox.bottomRight.x = this.width - this.settings.rightPadding;
  }

  updateVerticalContentBoxAxis() {
    this.contentBox.bottomRight.y = this.height - this.settings.bottomPadding;
  }

  /**
   * Based on alignment and offset, returns the optimal the initial position for nested children
   * @returns Initial position
   */
  getInitialNestedPosition(
    virtualLength: number,
    usedLength: number,
    alignment: Alignment,
    offset: number = 0
  ): number {
    if (alignment === Alignment.END) {
      return virtualLength;
    } else if (alignment === Alignment.CENTER) {
      const centerPoint = (virtualLength - offset) / 2 + offset;
      return centerPoint - usedLength / 2;
    } else {
      // START or EXPANDED with padding
      return offset;
    }
  }

  resetElementLength() {
    this.usedWidth = 0;
    this.usedHeight = 0;
  }

  incrementUsedWidth(value: number) {
    this.usedWidth += value;

    if (this.usedWidth > this.width) {
      this.width = this.usedWidth;
    }

    // Updating maximum element width
    if (value > this.maxChildWidth) {
      this.maxChildWidth = value;
    }

    this.updateSizeReference();

    // Updating content box limit
    this.updateHorizontalContentBoxAxis();
  }

  incrementUsedHeight(value: number) {
    this.usedHeight += value;

    if (this.usedHeight > this.height) {
      this.height = this.usedHeight;
    }

    // Updating maximum element height
    if (value > this.maxChildHeight) {
      this.maxChildHeight = value;
    }

    this.updateSizeReference();

    // Updating content box limit
    this.updateVerticalContentBoxAxis();
  }

  updateSizeReference() {
    const virtualLengthWithoutPadding =
      this.width - (this.children.length - 1) * this.settings.spaceBetween;
    const potentialOptimalSize =
      virtualLengthWithoutPadding / this.children.length;

    if (potentialOptimalSize <= this.maxChildWidth && this.hasNestedGroup) {
      this.sizeReference = this.maxChildWidth;
    } else {
      this.sizeReference = potentialOptimalSize;
    }
  }

  addContainer(container: BaseElement | LayoutElementGroup) {
    const isHorizontal = this.childrenDirection === Direction.HORIZONTAL;
    const incrementUsedMainLength: (value: number) => void = isHorizontal
      ? this.incrementUsedWidth
      : this.incrementUsedHeight;
    const setCrossDimension: (value: number) => void = isHorizontal
      ? this.setWidth
      : this.setHeight;
    let mainIncrementValue: number = isHorizontal
      ? container.getWidth()
      : container.getHeight();
    const crossIncrementValue: number = isHorizontal
      ? container.getHeight()
      : container.getWidth();

    if (container) {
      this.children.push(container);

      this.hasNestedGroup =
        this.hasNestedGroup || container instanceof LayoutElementGroup;

      if (this.children.length > 1) {
        mainIncrementValue += this.settings.spaceBetween;
      }

      incrementUsedMainLength(mainIncrementValue);
      setCrossDimension(crossIncrementValue);

      if (container instanceof BaseElement) {
        this.applyDistribution();
        container.setParentId(this.id);
      }
    }
  }

  applyDistribution(): void {
    this.applyHorizontalDistribution();
    this.applyVerticalDistribution();
  }

  /**
   * Distributes children over the element area, considering Main Axis alignment option
   */
  applyHorizontalDistribution() {
    this.distributeElements(
      this.verticalAlignment,
      this.getWidth(),
      (child) => child.getWidth(),
      (child, value) => child.setWidth(value),
      (child, value) => child.setX(value),
      this.verticalAlignment === Alignment.END
        ? this.contentBox.bottomRight.y
        : this.contentBox.topLeft.y
    );
  }

  /**
   * Distributes children over the element area, considering Cross Axis alignment option
   */
  applyVerticalDistribution() {
    this.alignElements(
      this.verticalAlignment,
      this.getHeight(),
      (child) => child.getHeight(),
      (child, value) => child.setY(value),
      this.verticalAlignment === Alignment.END
        ? this.contentBox.bottomRight.y
        : this.contentBox.topLeft.y
    );
  }

  /**
   * Distributes children over the element area, considering alignment option
   * @param alignment Alignment option to be applied
   * @param totalSize Container dimension length to be considered
   * @param getChildSize Callback to get the child dimension length
   * @param setChildSize Callback to set the child dimension length
   * @param setChildPosition Callback to set the child position
   * @param offset Offset to be considered when calculating position
   */
  distributeElements(
    alignment: Alignment,
    totalSize: number,
    getChildSize: (child: LayoutElementGroup | BaseElement) => number,
    setChildSize: (
      child: LayoutElementGroup | BaseElement,
      value: number
    ) => void,
    setChildPosition: (
      child: LayoutElementGroup | BaseElement,
      value: number
    ) => void,
    offset: number = 0
  ) {
    const refSize = this.sizeReference;
    const spaceBetween = this.settings.spaceBetween;
    let cursor = offset; // Setting the initial cursor position

    // Adjusting size and position for all children
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];

      if (alignment === Alignment.EXPANDED) {
        setChildSize(child, refSize);
        setChildPosition(child, cursor);

        cursor += refSize + spaceBetween;
      } else if (
        alignment === Alignment.START ||
        alignment === Alignment.CENTER
      ) {
        setChildPosition(child, cursor);

        cursor += totalSize + spaceBetween;
      } else if (alignment === Alignment.END) {
        cursor -= totalSize;

        setChildPosition(child, cursor);

        cursor -= spaceBetween;
      }
    }
  }

  /**
   * Aligns children over the element area, considering alignment option
   * @param alignment Alignment option to be applied
   * @param totalSize Container dimension length to be considered
   * @param getChildSize Callback to get the child dimension length
   * @param setChildPosition Callback to set the child position
   * @param offset Offset to be considered when calculating position
   */
  alignElements(
    alignment: Alignment,
    totalSize: number,
    getChildSize: (child: LayoutElementGroup | BaseElement) => number,
    setChildPosition: (
      child: LayoutElementGroup | BaseElement,
      value: number
    ) => void,
    offset: number = 0
  ) {
    // Adjusting size and position for all children
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      const childSize = getChildSize(child);

      if (alignment === Alignment.EXPANDED) {
        child.setHeight(totalSize);
        setChildPosition(child, offset);
      } else if (alignment === Alignment.START) {
        setChildPosition(child, offset);
      } else if (alignment === Alignment.CENTER) {
        setChildPosition(child, totalSize / 2 - childSize / 2);
      } else if (alignment === Alignment.END) {
        setChildPosition(child, totalSize - offset - childSize);
      }
    }
  }

  incrementSubTreeCounting() {
    this.subTreeCounting++;
  }

  /**
   * Updates the size of the element based on its content, considering children`s width and height
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
        this.incrementUsedWidth(mainLengthIncrement);

        notEmptyChildCount++;
      }

      // Updating cross length if needed
      if (crossLengthIncrement > this.usedHeight) {
        this.usedHeight = crossLengthIncrement;
      }
    }

    // Adding space between
    if (notEmptyChildCount > 0) {
      const spaceBetweenTotalIncrement =
        (notEmptyChildCount - 1) * this.settings.spaceBetween;

      this.incrementUsedWidth(spaceBetweenTotalIncrement);
    }

    // Replacing virtualLength if needed
    if (this.usedWidth > this.width) {
      this.width = this.usedWidth;
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
   * Applies translation over the position of the element and its nested children
   * @param deltaX
   * @param deltaY
   */
  translatePosition(deltaX: number, deltaY: number) {
    this.translateElementGroupPosition(deltaX, deltaY);

    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];

      child.translatePosition(this.getX(), this.getY());
    }
  }
}
