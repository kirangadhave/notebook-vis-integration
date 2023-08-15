import { useHookstate } from '@hookstate/core';
import { Box, ColorSwatch, Tabs, Stack } from '@mantine/core';
import { useMemo } from 'react';
import { TrrackableCell } from '../cells';
import { TabComponents, TabbedSidebar } from '../components/TabbedSidebar';
import { PredictionList } from '../intent/Prediction';
import { TrrackVisComponent } from './trrackVis';
import DataTable from 'react-data-table-component';
import { getInteractionsFromRoot } from '../interactions/helpers';
import { TrrackManager } from '../trrack';

type Props = {
  cell: TrrackableCell;
};

export function interactionDescription(trrackManager: TrrackManager) {
  const interactions = getInteractionsFromRoot(trrackManager);

  const interactionStrings = interactions.map(interaction => {
    switch (interaction.type) {
      case 'selection':
        return 'Created selection with n data points';

      case 'aggregate':
        console.log(interaction);
        break;

      case 'categorize':
        console.log(interaction);
        break;

      case 'create':
        return 'Created new column';

      case 'filter':
        return `Filtered ${interaction.direction} the selection`;

      case 'intent':
        console.log(interaction);
        break;

      case 'label':
        return `Labeled the selection \`${interaction.label}\``;

      case 'note':
        console.log(interaction);
        break;

      case 'rename-column':
        return `Renamed column \`${interaction.prevColumnName}\` to \`${interaction.newColumnName}\``;

      case 'sort':
        return `Sorted ${interaction.col}, ${interaction.direction}`;
    }
  });

  return interactionStrings.join(' \n * ');
}

export const tabs = ['trrack', 'intent', 'selections'] as const;

export type TabKey = (typeof tabs)[number];

export function SidebarComponent({ cell }: Props) {
  const predictions = useHookstate(cell.predictions);
  const newLoaded = useHookstate(cell.newPredictionsLoaded);
  const selections = useHookstate(cell.selectionsState);

  console.log(selections);

  console.log(interactionDescription(cell.trrackManager));

  const selected = cell.trrackManager.calculateSelections(
    cell.vegaManager?.view
  );

  const columns =
    selected.length > 0
      ? Object.keys(selected[0]).map(key => ({
          name: key,
          selector: (row: any) => row[key]
        }))
      : [];

  console.log(selected, columns);

  const tabComponents: TabComponents<TabKey> = useMemo(() => {
    return {
      trrack: {
        label: 'Trrack',
        component: <TrrackVisComponent cell={cell} />
      },
      intent: {
        label: 'Intent',
        component: (
          <Box
            sx={{
              paddingLeft: '0.5em',
              paddingRight: '0.5em',
              paddingTop: '1em',
              paddingBottom: '0.3em'
            }}
          >
            <PredictionList cell={cell} predictions={predictions} />
          </Box>
        ),
        header: (
          <Tabs.Tab
            value="intent"
            rightSection={
              newLoaded.get() ? <ColorSwatch color="green" size="xs" /> : null
            }
          >
            Intent
          </Tabs.Tab>
        )
      },
      selections: {
        label: 'Selections',
        component: (
          <Stack
            spacing={0}
            sx={{
              width: '100%',
              height: '100%'
            }}
          >
            <DataTable
              customStyles={{
                pagination: {
                  style: {
                    marginTop: 'auto'
                  }
                }
              }}
              pagination
              responsive
              data={selected}
              columns={columns}
              paginationComponentOptions={{ noRowsPerPage: true }}
            />
          </Stack>
        )
      }
    };
  }, [cell, predictions, newLoaded.get()]);

  return (
    <TabbedSidebar cell={cell} tabKeys={tabs} tabComponents={tabComponents} />
  );
}
