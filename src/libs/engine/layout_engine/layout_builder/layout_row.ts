import { Alignment } from "@libs/common/Alignment.enum";
import { Settings } from "@libs/engine/layout_engine/settings";
import { LayoutGroup } from "@libs/engine/layout_engine/layout_builder/layout_group";
import { Direction } from "@libs/common/distribution.enum";
import { Dimension } from "@libs/model/dimension";

export class LayoutRow extends LayoutGroup {
  constructor(
    externalId: string | null,
    horizontalAlignment: Alignment,
    verticalAlignment: Alignment,
    settings: Settings,
    parent: LayoutGroup | null,
    initialDimension?: Dimension
  ) {
    super(
      externalId,
      horizontalAlignment,
      verticalAlignment,
      Direction.HORIZONTAL,
      settings,
      {
        topOffset: 0,
        leftOffset: 0,
        bottomOffset: 0,
        rightOffset: 0,
      },
      parent,
      initialDimension
    );
  }
}
