import { useModelState } from '@anywidget/react';
import React, { useCallback, useEffect, useMemo } from 'react';
import { TrrackableCell } from '../../cells';
import { Button, Divider, Group, Tooltip } from '@mantine/core';
import { PersistCommandRegistry, PersistCommands } from '../../commands';
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconFilterMinus,
  IconFilterPlus
} from '@tabler/icons-react';
import { CommandButton } from './CommandButton';
import { Annotate } from './Annotate';
import { UseSignal } from '@jupyterlab/apputils';
import { RenameColumnPopover } from './RenameColumnPopover';
import { DropColumnPopover } from './DropColumnPopover';
import { EditCategoryPopover } from './EditCategoryPopover';
import { AssignCategoryPopover } from './AssignCategoryPopover';
import { GeneratedRecord } from '../utils/dataframe';
import { HeaderActionIcon } from './StyledActionIcon';
import { useHookstate } from '@hookstate/core';

type Props = {
  cell: TrrackableCell;
};

export function Header({ cell }: Props) {
  const current = useHookstate(cell.trrackManager.trrack.current.id); // Trrack current change
  const [hasSelections] = useModelState<boolean>('df_has_selections');
  const [generatedRecord, setGeneratedRecord] =
    useModelState<GeneratedRecord>('gdr_record');

  const resetDataframes = useCallback((record: GeneratedRecord) => {
    const newRecord: GeneratedRecord = {};

    Object.values(record).forEach(record => {
      if (record.isDynamic) {
        newRecord[record.dfName] = record;
      }
    });

    setGeneratedRecord(newRecord);
  }, []);

  useEffect(() => {
    const manager = cell.trrackManager;
    function onCurrentNodeChange() {
      current.set(manager.trrack.current.id);
    }

    cell.trrackManager.currentChange.connect(onCurrentNodeChange);

    return () => {
      cell.trrackManager.currentChange.disconnect(onCurrentNodeChange);
    };
  }, [cell, current]);

  const { canUndo, canRedo } = useMemo(() => {
    return {
      canUndo: cell.trrackManager.trrack.root.id !== current.value,
      canRedo: cell.trrackGraph?.nodes[current.value]?.children?.length || 0 > 0
    };
  }, [cell, current.value]);

  return (
    <Group
      style={{
        borderBottom: '2px solid rgb(0, 0, 0, 10%)',
        padding: '1em'
      }}
    >
      <HeaderActionIcon
        disabled={!canUndo}
        onClick={() => {
          cell.trrackManager.trrack.undo();
        }}
      >
        <Tooltip.Floating label="Undo" offset={20}>
          <IconArrowBackUp />
        </Tooltip.Floating>
      </HeaderActionIcon>
      <HeaderActionIcon
        disabled={!canRedo}
        onClick={() => {
          cell.trrackManager.trrack.redo();
        }}
      >
        <Tooltip.Floating label="Redo" offset={20}>
          <IconArrowForwardUp />
        </Tooltip.Floating>
      </HeaderActionIcon>
      <Divider orientation="vertical" />
      <RenameColumnPopover cell={cell} />
      <DropColumnPopover cell={cell} />
      <Divider orientation="vertical" />
      <EditCategoryPopover cell={cell} />
      <AssignCategoryPopover cell={cell} />
      <Divider orientation="vertical" />
      <CommandButton
        cell={cell}
        commandRegistry={PersistCommandRegistry.instance.registry}
        commandId={PersistCommands.filterOut}
        icon={<IconFilterMinus />}
        isDisabled={!hasSelections}
        commandArgs={{
          direction: 'out'
        }}
      />
      <CommandButton
        cell={cell}
        commandRegistry={PersistCommandRegistry.instance.registry}
        commandId={PersistCommands.filterIn}
        icon={<IconFilterPlus />}
        isDisabled={!hasSelections}
        commandArgs={{
          direction: 'in'
        }}
      />
      <Divider orientation="vertical" />
      <UseSignal
        signal={PersistCommandRegistry.instance.registry.commandChanged}
      >
        {() => <Annotate cell={cell} isDisabled={!hasSelections} />}
      </UseSignal>
      <Divider orientation="vertical" />
      <Button.Group>
        <Button
          px="0.3em"
          size="xs"
          variant="subtle"
          onClick={() => {
            resetDataframes(generatedRecord);
            PersistCommandRegistry.instance.execute(
              PersistCommands.resetTrrack,
              {
                cell
              }
            );
          }}
        >
          Reset Trrack
        </Button>
        <Button
          px="0.3em"
          size="xs"
          variant="subtle"
          onClick={() => resetDataframes(generatedRecord)}
        >
          Delete datasets
        </Button>
      </Button.Group>
    </Group>
  );
}
