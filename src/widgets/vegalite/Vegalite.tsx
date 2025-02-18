import { useModel, useModelState } from '@anywidget/react';
import { Group, LoadingOverlay, Stack } from '@mantine/core';
import { debounce } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';
import { SignalListeners, VegaLite } from 'react-vega';
import { View } from 'vega';
import { TopLevelSpec } from 'vega-lite';
import { SelectionParameter } from 'vega-lite/build/src/selection';
import { TrrackableCell } from '../../cells';
import { PersistCommandRegistry, PersistCommands } from '../../commands';

import { useDebouncedValue, useLocalStorage } from '@mantine/hooks';
import { PersistViews } from '../../utils/globals';

type Props = {
  cell: TrrackableCell;
};

export function Vegalite({ cell }: Props) {
  const [spec] = useModelState<TopLevelSpec>('spec'); // Load spec
  const [selectionNames] = useModelState<string[]>('selection_names');
  const [selectionTypes] =
    useModelState<Record<string, 'point' | 'interval'>>('selection_types');
  const [signalListeners, setSignalListeners] = useState<SignalListeners>({});
  const [waitTime] = useLocalStorage<number>({
    key: '_persist_vegalite_debounce_time',
    defaultValue: 200
  });

  const [widgetIsApplying] = useModelState<boolean>('is_applying');
  const [isApplying] = useDebouncedValue(widgetIsApplying, 300);

  const _spec = useMemo(() => JSON.parse(spec as any), [spec]);

  const model = useModel(); // Load widget model

  // Callback to set a Vega view object in VegaView
  const newViewCallback = useCallback(
    (view: View) => {
      PersistViews.instance.set(cell, view);
      const sigListeners: SignalListeners = {};

      selectionNames.forEach(name => {
        const storeName = `${name}_store`; // Store name for selection

        sigListeners[name] = debounce(
          (_: string, value: SelectionParameter['value']) => {
            PersistCommandRegistry.instance.execute(
              PersistCommands.intervalSelection,
              {
                cell,
                name,
                value,
                store: view.data(storeName) || [],
                brush_type: selectionTypes[name] || 'interval'
              }
            );
          },
          waitTime
        ) as any;
      });

      setSignalListeners(sigListeners);
    },
    [cell, model, selectionNames, selectionTypes, waitTime]
  );

  return (
    <Group>
      <Stack pos="relative">
        <LoadingOverlay visible={isApplying} />
        <VegaLite
          spec={_spec}
          onNewView={newViewCallback}
          signalListeners={signalListeners}
        />
      </Stack>
    </Group>
  );
}
