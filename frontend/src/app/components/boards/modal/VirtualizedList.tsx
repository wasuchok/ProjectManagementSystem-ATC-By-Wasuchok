"use client";

import { memo, type ReactElement } from "react";
import { FixedSizeList, type ListChildComponentProps } from "react-window";

type Props<Item> = {
    items: Item[];
    height: number;
    itemHeight: number;
    overscanCount?: number;
    itemKey: (index: number, data: Item[]) => string;
    renderRow: (item: Item, index: number) => ReactElement;
};

function VirtualizedListInner<Item>({
    items,
    height,
    itemHeight,
    overscanCount = 6,
    itemKey,
    renderRow,
}: Props<Item>) {
    const Row = ({ index, style, data }: ListChildComponentProps<Item[]>) => (
        <div style={style} className="px-0">
            {renderRow(data[index], index)}
        </div>
    );

    return (
        <FixedSizeList
            height={height}
            width="100%"
            itemCount={items.length}
            itemSize={itemHeight}
            itemData={items}
            itemKey={itemKey}
            overscanCount={overscanCount}
        >
            {Row}
        </FixedSizeList>
    );
}

export default memo(VirtualizedListInner) as typeof VirtualizedListInner;
