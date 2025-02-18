import { useModelState } from '@anywidget/react';
import React, { useCallback, useEffect, useMemo } from 'react';
import { ActionIcon, Box, Center, Text, LoadingOverlay } from '@mantine/core';
import {
  Prediction,
  Predictions,
  predictionToIntent
} from '../../intent/types';
import { useDisclosure, useElementSize } from '@mantine/hooks';
import { ScaleLinear, scaleLinear } from 'd3';
import { TrrackableCell } from '../../cells';
import { IconCheck } from '@tabler/icons-react';
import { Nullable } from '../../utils/nullable';
import { debounce } from 'lodash';
import { PersistCommandRegistry, PersistCommands } from '../../commands';
import { PersistViews } from '../../utils/globals';

type Props = {
  cell: TrrackableCell;
  notifyPredictionReady: (status: 'none' | 'loading' | 'ready') => void;
  activeTab: string;
  setActive: () => void;
};

export function Intent({ cell, notifyPredictionReady, setActive }: Props) {
  const { ref, width } = useElementSize();
  const [predictions] = useModelState<Predictions>('intents');
  const [loadingPredictions] = useModelState<boolean>('loading_intents');
  const scale = useMemo(() => {
    return scaleLinear().domain([0, 1]).range([0, width]);
  }, [predictions, width]);

  useEffect(() => {
    if (loadingPredictions) {
      notifyPredictionReady('loading');
    }

    if (!loadingPredictions && predictions.length === 0) {
      notifyPredictionReady('none');
    }

    if (!loadingPredictions && predictions.length > 0) {
      notifyPredictionReady('ready');
      setActive();
    }
  }, [loadingPredictions, predictions, notifyPredictionReady, setActive]);

  return (
    <Box ref={ref} sx={{ position: 'relative', height: '100%' }}>
      <LoadingOverlay
        visible={loadingPredictions}
        loaderProps={{
          variant: 'bars'
        }}
      />

      {predictions.length > 0 &&
        predictions.map(pred => (
          <PredictionComponent
            key={pred.intent + pred.algorithm + pred.rank_jaccard}
            scale={scale}
            prediction={pred}
            cell={cell}
            rankGetter={p => p.rank_jaccard}
          />
        ))}
      {predictions.length === 0 && (
        <Center>
          <Text>No predictions available.</Text>
        </Center>
      )}
    </Box>
  );
}
type PredictionComponentProps = {
  prediction: Prediction;
  cell: TrrackableCell;
  scale: ScaleLinear<number, number>;
  rankGetter: (p: Prediction) => number;
  height?: number;
};

export function PredictionComponent({
  prediction,
  scale,
  height = 30,
  rankGetter,
  cell
}: PredictionComponentProps) {
  const [hover, hoverHandlers] = useDisclosure(false);
  const { ref, width } = useElementSize();
  const [ID_COLUMN] = useModelState<string>('df_id_column_name');

  const notifyVegaOfHover = useCallback(
    debounce((pred: Nullable<Prediction>) => {
      const view = PersistViews.instance.get(cell);

      if (view) {
        view.signal('__test_selection____pred_hover__', pred?.members || []);
      }
    }, 200),
    [cell]
  );

  const computed_rank = rankGetter(prediction);

  const fill = 'rgb(168,211,238)';

  return (
    <Box
      style={{
        position: 'relative',
        cursor: 'pointer'
      }}
      onMouseOver={() => {
        hoverHandlers.open();
        notifyVegaOfHover(prediction);
      }}
      onMouseOut={() => {
        hoverHandlers.close();
        notifyVegaOfHover(null);
      }}
    >
      <svg ref={ref} height={height} width="100%">
        <rect
          height={height}
          width={width}
          fill={fill}
          opacity={hover ? 0.5 : 0.3}
        />
        <rect
          height={height}
          width={scale(computed_rank)}
          fill={fill}
          opacity="0.9"
        />
        <text
          transform={`translate(4, ${height / 2})`}
          dominantBaseline="middle"
          textAnchor="start"
        >{`${prediction.intent} - ${computed_rank.toFixed(3)}`}</text>
      </svg>
      {hover && (
        <ActionIcon
          h={height / 4}
          w={height / 4}
          style={{
            position: 'absolute',
            right: 0,
            top: height / 8
          }}
          size="xs"
          radius="xl"
          color="green"
          onClick={() => {
            const intent = predictionToIntent(prediction);
            const members = intent.members;

            PersistCommandRegistry.instance.execute(
              PersistCommands.intentSelection,
              {
                cell,
                intent,
                name: 'index_selection',
                store: members.map(p => ({
                  field: ID_COLUMN,
                  channel: 'y',
                  type: 'E' as const,
                  values: [p]
                })),
                value: members.map(p => ({ [ID_COLUMN]: p })),
                brush_type: 'point'
              }
            );
            // cell.trrackManager.actions.addIntentSelection({
            //   id: UUID.uuid4(),
            //   type: 'intent',
            //   intent: prediction.get({ noproxy: true }) as any
            // });
          }}
        >
          <IconCheck />
        </ActionIcon>
      )}
    </Box>
  );
}
