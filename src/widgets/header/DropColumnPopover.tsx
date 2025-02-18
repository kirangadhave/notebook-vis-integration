import { useModelState } from '@anywidget/react';
import React from 'react';
import {
  Button,
  Center,
  Checkbox,
  Group,
  Popover,
  Stack,
  Title,
  Tooltip
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconColumnRemove } from '@tabler/icons-react';
import { useState } from 'react';
import { TrrackableCell } from '../../cells';
import { PersistCommandRegistry, PersistCommands } from '../../commands';
import { DropColumnsCommandArgs } from '../../interactions/dropColumn';
import { HeaderActionIcon } from './StyledActionIcon';

type Props = {
  cell: TrrackableCell;
};

export function DropColumnPopover({ cell }: Props) {
  const [opened, openHandlers] = useDisclosure(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [columns = []] = useModelState<string[]>('df_columns_non_meta');

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
          <Tooltip.Floating label="Drop Column" offset={20}>
            <IconColumnRemove />
          </Tooltip.Floating>
        </HeaderActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <Center w={300} mt="sm" mb="md">
          <Stack>
            <Title size="xs" order={4}>
              Drop Columns
            </Title>
            <Checkbox.Group
              value={selectedColumns}
              onChange={setSelectedColumns}
            >
              <Group mt="xs">
                {columns.map(c => (
                  <Checkbox size="xs" key={c} value={c} label={c} />
                ))}
              </Group>
            </Checkbox.Group>
            <Button
              size="xs"
              disabled={selectedColumns.length === 0}
              onClick={async () => {
                const args: DropColumnsCommandArgs = {
                  cell,
                  columns: selectedColumns
                };

                PersistCommandRegistry.instance.execute(
                  PersistCommands.dropColumns,
                  args
                );
                setSelectedColumns([]);
                openHandlers.close();
              }}
            >
              Drop selected
            </Button>
          </Stack>
        </Center>
      </Popover.Dropdown>
    </Popover>
  );
}
