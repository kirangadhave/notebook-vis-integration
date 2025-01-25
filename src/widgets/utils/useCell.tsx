import React, { ComponentType, useEffect, useRef, useState } from 'react';
import { CODE_CELL, TrrackableCell } from '../../cells';
import { Nullable } from '../../utils/nullable';
import { Flex } from '@mantine/core';

// Figure out what to change to get it working without this
export function useCell<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);

  const [cell, setCell] = useState<Nullable<TrrackableCell>>(null);

  useEffect(() => {
    const element = ref.current;
    if (element) {
      const cellDOMNode = element.closest(
        `[data-celltype="${CODE_CELL}"]`
      ) as HTMLElement;

      if (!cellDOMNode) {
        return;
      }
      // throw new Error('Cannot find data attribute for code-cell instance');

      const id = cellDOMNode.dataset.id;

      if (!id) {
        return;
      }
      // throw new Error('Cannot find id to code-cell instance');

      const cell = window.Persist.CellMap.get(id);

      if (!cell) {
        return;
      }
      // throw new Error('Cannot find code-cell instance');

      setCell(cell);
    }
  }, [ref]);

  return { ref, cell };
}

export function withTrrackableCell<P>(
  WrappedComponent: ComponentType<P & { cell: TrrackableCell }>
) {
  const ComponentWithTrrackableCell = (props: P) => {
    const { ref, cell } = useCell();

    return (
      <Flex direction="column">
        <div ref={ref} style={{ display: 'none', height: 0, width: 0 }}></div>
        {cell && <WrappedComponent {...props} cell={cell} />}
      </Flex>
    );
  };

  return ComponentWithTrrackableCell;
}
