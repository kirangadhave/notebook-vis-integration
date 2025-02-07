from altair import ParameterName, TopLevelSpec, Undefined
import traitlets
from persist_ext.internals.widgets.base.widget_with_data import WidgetWithData
from persist_ext.internals.widgets.interactions.selection import Selections
from persist_ext.internals.widgets.vegalite_chart.parameters import (
    Parameters,
    get_param_name,
)
from persist_ext.internals.widgets.vegalite_chart.utils import (
    TEST_SELECTION_PREFIX,
    check_encodings_for_utc_recursive,
)


def copy_altair_chart(chart: TopLevelSpec):
    if chart is None:
        return None
    return chart.copy(deep=True)


class WidgetWithChart(WidgetWithData):
    _persistent_chart = traitlets.Instance(TopLevelSpec, allow_none=True)

    chart = traitlets.Instance(TopLevelSpec, allow_none=True)

    spec = traitlets.Unicode("").tag(sync=True)

    param_names = traitlets.List().tag(sync=True)
    selection_names = traitlets.List().tag(sync=True)
    selection_types = traitlets.Dict().tag(sync=True)

    def __init__(self, id: str, chart, *args, **kwargs):
        self.params = Parameters()
        self.selections = Selections()

        if chart is not None:
            chart = self.process_chart(chart)

        super(WidgetWithChart, self).__init__(
            id=id,
            chart=copy_altair_chart(chart),
            _persistent_chart=copy_altair_chart(chart),
            *args,
            **kwargs,
        )

    def copy_original_chart(self):
        if self._persistent_chart is None:
            return None
        return copy_altair_chart(self._persistent_chart)

    def process_chart(self, chart):
        check_encodings_for_utc_recursive(chart)

        chart = copy_altair_chart(chart)
        return chart

    @traitlets.observe("chart")
    def _on_chart_change(self, change):
        chart = change.new

        if not chart:
            return

        with self.hold_sync():
            params = getattr(chart, "params", Undefined)

            if params is not Undefined:
                for param in params:
                    name = get_param_name(param)

                    if name.startswith(TEST_SELECTION_PREFIX):
                        continue

                    select = getattr(param, "select", Undefined)

                    if select is Undefined:
                        self.params.add_param(name, param, False)
                    elif self.selections.has(name):
                        continue
                    else:
                        select = (
                            select if isinstance(select, dict) else select.to_dict()
                        )

                        selection_type = select["type"]

                        self.selections.add_param(
                            name, brush_type=selection_type, throw=False
                        )
                        self.selection_types[name] = selection_type

            self.spec = chart.to_json()
            self.selection_names = self.selections.names()
            self.param_names = self.params.names()


# "trrack": {
#   "srcFileName": "Trrack.tsx",
#   "dir": "trrack",
#   "fileName": "trrack.js"
# },
# "header": {
#   "srcFileName": "Header.tsx",
#   "dir": "header",
#   "fileName": "header.js"
# },
# "vegalite": {
#   "srcFileName": "Vegalite.tsx",
#   "dir": "vegalite",
#   "fileName": "vegalite.js"
# },
# "interactive_table": {
#   "srcFileName": "interactive_table.tsx",
#   "dir": "interactive_table",
#   "fileName": "interactive_table.js"
# },
# "intent": {
#   "srcFileName": "Intent.tsx",
#   "dir": "intent",
#   "fileName": "intent.js"
# },
# "dataframe_footer": {
#   "srcFileName": "DataframeFooter.tsx",
#   "dir": "dataframe_footer",
#   "fileName": "DataframeFooter.js"
# },
#
