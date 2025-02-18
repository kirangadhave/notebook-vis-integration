import { ReadonlyPartialJSONObject } from '@lumino/coreutils';
import React, { useEffect } from 'react';
import {
  Button,
  Center,
  Popover,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip
} from '@mantine/core';
import { useDisclosure, useValidatedState } from '@mantine/hooks';
import { IconEdit } from '@tabler/icons-react';
import { useState } from 'react';
import { TrrackableCell } from '../../cells';
import { PersistCommandRegistry, PersistCommands } from '../../commands';
import { RenameColumnCommandArgs } from '../../interactions/renameColumn';
import { useModelState } from '@anywidget/react';
import { HeaderActionIcon } from './StyledActionIcon';

type Props = {
  cell: TrrackableCell;
};

export function RenameColumnPopover({ cell }: Props) {
  const [opened, openHandlers] = useDisclosure(false);
  const [activeColumn, setActiveColumn] = useState<string | null>(null);
  const [columns = []] = useModelState<string[]>('df_columns_non_meta');
  const [newName, setNewName] = useValidatedState(
    '',
    val => !columns.includes(val),
    true
  );

  useEffect(() => {
    if (!opened) {
      setActiveColumn(null);
      setNewName('');
    }
  }, [opened]);

  const columnObject = columns.map(col => ({
    label: col,
    value: col
  }));

  return (
    <Popover
      opened={opened}
      onChange={openHandlers.toggle}
      withinPortal
      withArrow
      shadow="xl"
    >
      <Popover.Target>
        <HeaderActionIcon
          variant="subtle"
          onClick={() => openHandlers.toggle()}
        >
          <Tooltip.Floating label="Rename Column" offset={20}>
            <IconEdit />
          </Tooltip.Floating>
        </HeaderActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <Center mt="sm" mb="md">
          <Stack>
            <Title size="xs" order={4}>
              Rename Column
            </Title>
            <Select
              size="xs"
              data={columnObject}
              value={activeColumn}
              onChange={setActiveColumn}
              placeholder="Select a column to rename"
              searchable
            />
            <TextInput
              size="xs"
              disabled={Boolean(
                !activeColumn || !columns.includes(activeColumn)
              )}
              error={!newName.valid}
              placeholder={`Enter new column name (no spaces) for ${activeColumn}`}
              value={newName.value}
              onChange={e => setNewName(e.currentTarget.value.trimStart())}
            />
            {!newName.valid && newName.value.length > 0 && (
              <Text size="sm" mt="md" style={{ overflowWrap: 'normal' }}>
                Column name {newName.value} already exists in the dataset.
              </Text>
            )}
            <Button
              size="xs"
              disabled={
                !activeColumn ||
                !newName.valid ||
                newName.value.trim().length === 0
              }
              onClick={async () => {
                if (
                  !activeColumn ||
                  !newName.valid ||
                  newName.value.length === 0
                ) {
                  return;
                }

                const args: RenameColumnCommandArgs = {
                  cell,
                  renameColumnMap: {
                    [activeColumn]: newName.value
                  }
                };

                PersistCommandRegistry.instance.registry.execute(
                  PersistCommands.renameColumns,
                  args as unknown as ReadonlyPartialJSONObject
                );
                setActiveColumn(null);
                setNewName('');
                openHandlers.close();
              }}
            >
              Rename
            </Button>
          </Stack>
        </Center>
      </Popover.Dropdown>
    </Popover>
  );
}
