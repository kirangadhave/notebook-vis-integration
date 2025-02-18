import React from 'react';
import {
  Button,
  Popover,
  Stack,
  Textarea,
  Title,
  Tooltip
} from '@mantine/core';

import { ReadonlyPartialJSONObject } from '@lumino/coreutils';
import { TrrackableCell } from '../../cells';
import { useDisclosure, useInputState } from '@mantine/hooks';
import { IconNotes } from '@tabler/icons-react';
import { PersistCommandRegistry, PersistCommands } from '../../commands';
import { AnnotateCommandArgs } from '../../interactions/annotate';
import { HeaderActionIcon } from './StyledActionIcon';

type Props = {
  cell: TrrackableCell;
  isDisabled?: boolean;
};

export function Annotate({ cell, isDisabled = false }: Props) {
  const [opened, openHandlers] = useDisclosure(false);
  const [note, setNote] = useInputState('');

  const args: AnnotateCommandArgs = {
    cell,
    text: note
  };

  const isEnabled = !isDisabled;
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
          onClick={() => openHandlers.toggle()}
          variant={isEnabled ? 'subtle' : 'transparent'}
          disabled={!isEnabled}
        >
          <Tooltip.Floating label="Annotate" offset={20}>
            <IconNotes />
          </Tooltip.Floating>
        </HeaderActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack>
          <Title size="xs" order={4}>
            Annotate selected items
          </Title>
          <Textarea
            size="xs"
            value={note}
            onChange={setNote}
            placeholder="Enter your notes here..."
            label="Your annotations:"
            autosize
            minRows={3}
          />
          <Button
            size="xs"
            disabled={!note.length}
            onClick={() => {
              // Annotate
              PersistCommandRegistry.instance.registry.execute(
                PersistCommands.annotate,
                args as unknown as ReadonlyPartialJSONObject
              );

              setNote('');
              openHandlers.close();
            }}
          >
            Annotate
          </Button>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
