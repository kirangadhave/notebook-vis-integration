import { TrrackableCell } from './trrackableCell';
import { AnyModel } from '@anywidget/types';

export class TrrackableCellFactory {
  createCodeCell(model: AnyModel) {
    return TrrackableCell.create(model);
  }
}
