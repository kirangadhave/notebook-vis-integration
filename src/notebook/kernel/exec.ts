import { ISessionContext } from '@jupyterlab/apputils';
import { INotebookTracker } from '@jupyterlab/notebook';
import { KernelMessage } from '@jupyterlab/services';
import { Nullable } from '../../types';

export const PY_STR_TYPE = 'str';
export const PY_PD_TYPE = 'pandas.core.frame.DataFrame';

type ExecuteReplyMsgStatus =
  KernelMessage.IExecuteReplyMsg['content']['status'];

type BaseOutput = {
  status: ExecuteReplyMsgStatus;
};

type KernelOutput =
  | (BaseOutput & {
      status: 'ok';
      content: string[];
    })
  | (BaseOutput & {
      status: 'error' | 'abort';
      err: any;
    });

export class Executor {
  private _ctx: Nullable<ISessionContext> = null;

  init(nbTracker: INotebookTracker) {
    nbTracker.currentChanged.connect(async (_, nbPanel) => {
      if (!nbPanel) {
        return;
      }

      this._ctx = nbPanel.sessionContext;
    });
  }

  async execute(code: string): Promise<KernelOutput> {
    return new Promise<KernelOutput>(res => {
      const kernel = this._ctx?.session?.kernel;
      if (!kernel) {
        res({
          status: 'error',
          err: new Error('No kernel found')
        });
        return;
      }

      const successOutput: KernelOutput = {
        status: 'ok',
        content: []
      };

      const future = kernel.requestExecute({
        code,
        stop_on_error: true,
        store_history: false
      });

      future.onIOPub = (msg: KernelMessage.IIOPubMessage) => {
        const msgType = msg.header.msg_type;
        const msgContent: any = msg.content;

        let content = '';

        switch (msgType) {
          case 'execute_result':
          case 'display_data':
          case 'update_display_data':
            content += msgContent['data']['text/plain'] || '';
            break;
          case 'stream':
            content += msgContent.text;
            break;
          default:
            break;
        }

        successOutput.content.push(
          ...content.split('\n').filter(c => c.length > 0)
        );
      };

      future.done
        .then(reply => {
          const status = reply.content.status;
          if (status !== 'ok') {
            res({
              status,
              err: reply.content
            });
          } else {
            res(successOutput);
          }
        })
        .catch(err => {
          console.warn('Execution failed', err);
          res({
            status: 'error',
            err
          });
        });
    });
  }
}

export namespace Executor {
  export function withIDE(code: string) {
    return `import interactivede.ide as IDE\n${code}`;
  }

  export function withJson(code: string) {
    return `import json\n${code}`;
  }

  export function withPandas(code: string) {
    return `import pandas as pd\n${code}`;
  }
}
