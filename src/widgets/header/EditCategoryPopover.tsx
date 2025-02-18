import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Center,
  Divider,
  Group,
  HoverCard,
  Popover,
  Select,
  Stack,
  Title,
  Tooltip,
  Text,
  createStyles,
  rem,
  Switch,
  TextInput,
  Paper,
  ActionIcon,
  CloseButton
} from '@mantine/core';
import {
  getHotkeyHandler,
  useDisclosure,
  useValidatedState
} from '@mantine/hooks';
import {
  IconCategoryPlus,
  IconGripVertical,
  IconHelp,
  IconMinus,
  IconPlus,
  IconTrash,
  IconX
} from '@tabler/icons-react';
import { TrrackableCell } from '../../cells';
import { HeaderActionIcon } from './StyledActionIcon';
import { useModelState } from '@anywidget/react';
import { PersistCommandRegistry, PersistCommands } from '../../commands';
import { Categories } from '../../interactions/categorize';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { PERSIST_ICON_SIZE } from '../interactive_table/constants';
import { NONE_CATEGORY_OPTION, useCategoryOptions } from './categoryHelpers';

type Props = {
  cell: TrrackableCell;
};

const useStyles = createStyles(theme => {
  return {
    hoverItem: {
      transition: 'border 0.3s ease',
      border: '1px solid rgba(0,0,0,0)',
      '&:hover': {
        border: '1px solid rgba(0,0,0,0.3)'
      }
    },
    hoverScale: {
      '&:hover': {
        //
      }
    },
    itemDragging: {
      boxShadow: theme.shadows.sm,
      border: '1px solid rgba(0,0,0,0.3)',
      cursor: 'grabbing'
    },
    dragHandle: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: theme.colors.gray[6],
      cursor: 'grab'
    },
    hideDragHandle: {
      opacity: 0.3,
      pointerEvents: 'none'
    }
  };
});

export function EditCategoryPopover({ cell }: Props) {
  const { classes, cx } = useStyles();
  const [opened, openHandlers] = useDisclosure(false);
  const [isAddingOption, setIsAddingOption] = useState(false);

  const [categoriesColumnRecord] = useModelState<Categories>(
    'df_category_columns'
  );

  const {
    categories,
    selectedCategory,
    setSelectedCategory,
    options,
    optionsHandlers,
    ordered,
    skipOptionsSyncRef
  } = useCategoryOptions(categoriesColumnRecord);

  const [newOption, setNewOptionValue] = useValidatedState<string>(
    '',
    value => !options.includes(value)
  );

  const addOptionCb = useCallback((category: string, option: string) => {
    PersistCommandRegistry.instance.execute(PersistCommands.categorize, {
      cell,
      action: {
        op: 'add',
        scope: 'option',
        category,
        option
      },
      overrideLabel: `Add new option '${option}' to category '${category}'`
    });
    setNewOptionValue('');
  }, []);

  useEffect(() => {
    if (!opened) {
      setNewOptionValue('');
    }
  }, [opened]);

  const CategorySelect = (
    <Select
      label={
        <Group spacing="xs" position="left">
          <Text>Select category to edit</Text>
          <HoverCard withArrow shadow="xl" openDelay={300}>
            <HoverCard.Target>
              <IconHelp color="gray" size={PERSIST_ICON_SIZE} />
            </HoverCard.Target>
            <HoverCard.Dropdown>
              <p>
                Start typing to search for categorical column and select it. You
                can also add a new one if you can't find one.
              </p>
              <p>
                For the selected column you can add/remove options, mark the
                column as ordered and change the order of the options.
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
      searchable
      clearable
      creatable
      getCreateLabel={q => `+ Add category '${q}'`}
      onCreate={q => {
        PersistCommandRegistry.instance.execute(PersistCommands.categorize, {
          cell,
          action: {
            op: 'add',
            scope: 'category',
            category: q
          },
          overrideLabel: `Add new category '${q}'`
        });

        return q;
      }}
      value={selectedCategory}
      onChange={setSelectedCategory}
    />
  );

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
          <Tooltip.Floating label="Edit categories" offset={20}>
            <IconCategoryPlus />
          </Tooltip.Floating>
        </HeaderActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <Center mt="sm" mb="md">
          <Stack>
            <Group position="apart">
              <Title size="xs" order={3}>
                Edit Categories
              </Title>
              <CloseButton color="red" onClick={() => openHandlers.close()} />
            </Group>
            {CategorySelect}

            {selectedCategory && (
              <>
                <Divider />
                <Title size="sx">Manage options for '{selectedCategory}'</Title>

                {ordered !== undefined && ordered !== null && (
                  <Switch
                    checked={ordered}
                    size="xs"
                    label="Order options"
                    onChange={() => {
                      PersistCommandRegistry.instance.execute(
                        PersistCommands.categorize,
                        {
                          cell,
                          action: {
                            op: 'reorder',
                            scope: 'options',
                            category: selectedCategory,
                            option: !ordered
                          },
                          overrideLabel: `Make category '${selectedCategory}' ${
                            ordered ? 'unordered' : 'ordered'
                          }`
                        }
                      );
                    }}
                  />
                )}

                {options.length > 0 && (
                  <>
                    <DragDropContext
                      onDragEnd={({ destination, source }) => {
                        const startIndex = source.index;
                        const endIndex = destination?.index || 0;

                        if (startIndex === endIndex) {
                          return;
                        }

                        skipOptionsSyncRef.current = true;

                        const opts = [...options];

                        const [toMove] = opts.splice(startIndex, 1);
                        opts.splice(endIndex, 0, toMove);

                        optionsHandlers.setState(opts);

                        PersistCommandRegistry.instance.execute(
                          PersistCommands.categorize,
                          {
                            cell,
                            action: {
                              op: 'reorder',
                              scope: 'options',
                              category: selectedCategory,
                              option: opts
                            },
                            overrideLabel: `Reorder options for '${selectedCategory}'`
                          }
                        );
                      }}
                    >
                      <Droppable droppableId="dnd-list" direction="vertical">
                        {provided => (
                          <Stack
                            mah="500px"
                            sx={{
                              overflow: 'auto'
                            }}
                            spacing="xs"
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                          >
                            {options
                              .filter(item => item !== NONE_CATEGORY_OPTION)
                              .map((item, index) => (
                                <Draggable
                                  key={item}
                                  draggableId={item}
                                  index={index}
                                >
                                  {(provided, snapshot) => (
                                    <Paper
                                      shadow={
                                        snapshot.isDragging ? 'xl' : 'none'
                                      }
                                      className={cx(classes.hoverItem, {
                                        [classes.itemDragging]:
                                          snapshot.isDragging
                                      })}
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      // rightSection={
                                      // }
                                    >
                                      <Group position="apart">
                                        <ActionIcon
                                          disabled={
                                            item === NONE_CATEGORY_OPTION
                                          }
                                          radius="lg"
                                          className={cx(classes.dragHandle, {
                                            [classes.hideDragHandle]: !ordered
                                          })}
                                          variant={
                                            item === NONE_CATEGORY_OPTION
                                              ? 'transparent'
                                              : 'subtle'
                                          }
                                          sx={{
                                            border: 'none'
                                          }}
                                          {...provided.dragHandleProps}
                                        >
                                          <IconGripVertical size="1rem" />
                                        </ActionIcon>
                                        {item}
                                        <ActionIcon
                                          disabled={
                                            item === NONE_CATEGORY_OPTION
                                          }
                                          color="red"
                                          variant="transparent"
                                          className={classes.hoverScale}
                                          onClick={() => {
                                            PersistCommandRegistry.instance.execute(
                                              PersistCommands.categorize,
                                              {
                                                cell,
                                                action: {
                                                  op: 'remove',
                                                  scope: 'option',
                                                  category: selectedCategory,
                                                  option: item
                                                },
                                                overrideLabel: `Remove option '${item}' from category '${selectedCategory}'`
                                              }
                                            );
                                          }}
                                        >
                                          <IconMinus size={rem(10)} />
                                        </ActionIcon>
                                      </Group>
                                    </Paper>
                                  )}
                                </Draggable>
                              ))}

                            {provided.placeholder}
                          </Stack>
                        )}
                      </Droppable>
                    </DragDropContext>
                  </>
                )}
                {isAddingOption ? (
                  <>
                    <TextInput
                      size="xs"
                      placeholder="New option value"
                      label="Enter value for new option here"
                      value={newOption.value}
                      autoFocus
                      onChange={e => setNewOptionValue(e.currentTarget.value)}
                      error={
                        !newOption.valid && 'Category options must be unique'
                      }
                      onKeyDown={getHotkeyHandler([
                        [
                          'Enter',
                          () =>
                            newOption.valid &&
                            addOptionCb(
                              selectedCategory,
                              newOption.lastValidValue
                            )
                        ]
                      ])}
                    />
                    <Group position="center">
                      <Button
                        size="xs"
                        variant="light"
                        disabled={
                          !newOption.valid || newOption.value.length === 0
                        }
                        leftIcon={<IconPlus size={PERSIST_ICON_SIZE} />}
                        onClick={() =>
                          addOptionCb(
                            selectedCategory,
                            newOption.lastValidValue
                          )
                        }
                      >
                        Add
                      </Button>
                      <Button
                        size="xs"
                        variant="light"
                        color="red"
                        leftIcon={<IconX size={PERSIST_ICON_SIZE} />}
                        onClick={() => {
                          setIsAddingOption(false);
                          setNewOptionValue('');
                        }}
                      >
                        Cancel
                      </Button>
                    </Group>
                  </>
                ) : (
                  <Button
                    size="xs"
                    variant="subtle"
                    color="gray"
                    onClick={() => setIsAddingOption(true)}
                  >
                    + Add Option
                  </Button>
                )}
                <Divider />
                <Button
                  color="red"
                  size="xs"
                  onClick={() => {
                    PersistCommandRegistry.instance.execute(
                      PersistCommands.categorize,
                      {
                        cell,
                        action: {
                          op: 'remove',
                          scope: 'category',
                          category: selectedCategory
                        },
                        overrideLabel: `Delete category '${selectedCategory}'`
                      }
                    );
                  }}
                  leftIcon={<IconTrash size={PERSIST_ICON_SIZE} />}
                >
                  Delete category '{selectedCategory}'
                </Button>
              </>
            )}
          </Stack>
        </Center>
      </Popover.Dropdown>
    </Popover>
  );
}
