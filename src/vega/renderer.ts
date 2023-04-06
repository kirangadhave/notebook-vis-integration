import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import { RenderedVega } from '@jupyterlab/vega5-extension';
import { Result } from 'vega-embed';
import { TrrackableCell } from '../cells';
import { RenderedTrrackOutput } from '../cells/output/renderer';
import { Nullable } from '../types';
import { IDEGlobal } from '../utils';

// const POS_ABS = 'pos-abs';
// const POS_REL = 'pos-rel';

export class RenderedTrrackVegaOutput extends RenderedTrrackOutput {
  constructor(options: IRenderMime.IRendererOptions) {
    super(options);
  }

  protected createRenderer(
    opts: IRenderMime.IRendererOptions
  ): IRenderMime.IRenderer {
    return new RenderedVega(opts);
  }

  protected postRender(cell: TrrackableCell): Promise<void> {
    const vegaManager = IDEGlobal.vegaManager.get(cell.cellId);

    if (!vegaManager) return Promise.resolve();

    vegaManager.renderer = this;
    vegaManager.addListeners();

    if (cell.trrackManager.isAtRoot) {
      cell.addSpecToMetadata(vegaManager.vega?.spec);
    }

    return Promise.resolve();
  }

  async renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    const renderResult = await super.renderModel(model);

    return renderResult;
  }

  get vega(): Nullable<Result> {
    return (this.executeResultRenderer as any)?._result;
  }
}
