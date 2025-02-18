import React from 'react';
import {
  Group,
  HoverCard,
  Popover,
  Select,
  Tooltip,
  Text,
  Stack,
  Divider,
  Button
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconCategory, IconHelp } from '@tabler/icons-react';
import { TrrackableCell } from '../../cells';
import { HeaderActionIcon } from './StyledActionIcon';
import { useModelState } from '@anywidget/react';
import { PersistCommandRegistry, PersistCommands } from '../../commands';
import { Categories } from '../../interactions/categorize';
import { PERSIST_ICON_SIZE } from '../interactive_table/constants';
import { useCategoryOptions } from './categoryHelpers';

type Props = {
  cell: TrrackableCell;
};

export function AssignCategoryPopover({ cell }: Props) {
  const [opened, openHandlers] = useDisclosure(false);
  const [hasSelections] = useModelState('df_has_selections');

  const [categoriesColumnRecord] = useModelState<Categories>(
    'df_category_columns'
  );

  const { categories, selectedCategory, setSelectedCategory, opts } =
    useCategoryOptions(categoriesColumnRecord, false);

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
          variant={!hasSelections ? 'transparent' : 'subtle'}
          disabled={!hasSelections}
        >
          <Tooltip.Floating label="Assign Category" offset={20}>
            <IconCategory />
          </Tooltip.Floating>
        </HeaderActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack>
          <Select
            label={
              <Group spacing="xs" position="left">
                <Text>Select a category</Text>
                <HoverCard withArrow shadow="xl" openDelay={300}>
                  <HoverCard.Target>
                    <IconHelp color="gray" size={PERSIST_ICON_SIZE} />
                  </HoverCard.Target>
                  <HoverCard.Dropdown>
                    <p>
                      Start typing to search for categorical column and select
                      it. You can also add a new one if you can't find one.
                    </p>
                    <p>
                      For the selected column you can add/remove options, mark
                      the column as ordered and change the order of the options.
                    </p>
                  </HoverCard.Dropdown>
                </HoverCard>
              </Group>
            }
            size="xs"
            placeholder="Search for a category..."
            data={categories}
            clearButtonProps={{
              title: 'Clear selected category'
            }}
            clearable
            value={selectedCategory}
            onChange={setSelectedCategory}
          />
          <Divider />
          {selectedCategory && opts.length > 0 && (
            <Stack spacing="xs">
              {opts.map(o => (
                <Button
                  size="xs"
                  variant="subtle"
                  color="blue"
                  key={o}
                  onClick={() => {
                    PersistCommandRegistry.instance.execute(
                      PersistCommands.categorize,
                      {
                        cell,
                        action: {
                          op: 'assign',
                          scope: 'option',
                          category: selectedCategory,
                          option: o
                        },
                        overrideLabel: `Assign ${selectedCategory} (${o}) to selected items`
                      }
                    );

                    openHandlers.close();
                  }}
                >
                  {o}
                </Button>
              ))}
            </Stack>
          )}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
