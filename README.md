# Persist

## Persistent and Reusable Interactions with Visualizations in Computational Notebooks

[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/visdesignlab/persist/main?urlpath=lab)

Persist is a JupyterLab extension to enable persistent interactive outputs in JupyterLab notebooks. Basically, you can manipulate data either in [Vega-Altair plots](https://altair-viz.github.io/) or in a data table and use the manipulated data later in code. 

Check out the introductory video below.

This repository contains source code for Persist ([PyPi](https://pypi.org/project/persist_ext/)) extension.

Visit [the persist website](https://vdl.sci.utah.edu/persist/) for more examples and full documentation. 

https://github.com/visdesignlab/persist/assets/14944083/c6a9347b-7c93-4d0d-9e60-e10707578327

[Watch on Youtube with CC](https://www.youtube.com/watch?v=DXHXPvRHN9I)

## Getting Started

### Requirements

```markdown
- JupyterLab >= 4.0.0 or Jupyter Notebook >= 7.0.0
- pandas >= 0.25
- altair >= 5
- ipywidgets
- anywidget
```

### Install

To install the extension, execute:

```bash
pip install persist_ext
```

If the Jupyter server was already running, you might have to reload the browser page and restart the kernel.

### Uninstall

To remove the extension, execute:

```bash
pip uninstall persist_ext
```

### Usage

Persist supports two types of interactive outputs — a custom data table and [Vega-Altair](https://altair-viz.github.io/) (>=5.0.0, see [requirements](https://github.com/visdesignlab/persist#requirements) and [caveats](https://github.com/visdesignlab/persist#caveats-on-using-vega-altair-and-persist)) charts. The following examples will walk you through creating each one.
The examples are also available as notebooks in the `examples` folder of the repository. Each section will link to the corresponding notebook as well as a binder link for the notebook.

Persist currently works with pandas dataframes, so load/convert the data to pandas dataframe before using.

### Examples

#### Visualize dataframe in an interactive data table

[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/visdesignlab/persist/HEAD?labpath=examples%2Fgetting_started_interactive_data_table.ipynb)

You can use the following code snippet to create a Persist-enabled interactive data table.

```python
from vega_datasets import data # Load vega_datasets
import persist_ext as PR # Load Persist Extension

cars_df = data.cars() # Get the cars dataset as Pandas dataframe

PR.PersistTable(cars_df) # Display cars dataset with interactive table
```

https://github.com/visdesignlab/persist/assets/14944083/eb174d57-55f3-4ee9-8b5d-189ad8746c26

#### Visualizing dataframe with `plot` module

[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/visdesignlab/persist/HEAD?labpath=examples%2Fgetting_started_plots_module.ipynb)

Persist has a plotting module to create an interactive scatterplot or bar chart quickly. This module is a thin wrapper around Vega-Altair.

To create a scatterplot:

```python
from vega_datasets import data # Load vega_datasets
import persist_ext as PR # Load Persist Extension

cars_df = data.cars() # Get the cars dataset as Pandas dataframe

PR.plot.scatterplot(data=cars_df, x="Miles_per_Gallon:Q", y="Weight_in_lbs:Q", color="Origin:N")
```

https://github.com/visdesignlab/persist/assets/14944083/fd75be32-ab2a-425e-8bce-f60c99baebbc

To create a barchart:

```python
from vega_datasets import data # Load vega_datasets
import persist_ext as PR # Load Persist Extension

cars_df = data.cars() # Get the cars dataset as Pandas dataframe

PR.plot.barchart(data=cars_df, x="Cylinders:N", y="count()")
```

https://github.com/visdesignlab/persist/assets/14944083/16d3be4c-9511-42ed-84ae-d4e65097a5b9

#### Interactive Vega-Altair charts

[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/visdesignlab/persist/HEAD?labpath=examples%2Fgetting_started_vega_altair.ipynb)

You can also use Vega-Altair charts directly by passing the chart object to the `PersistChart` function.

```python
from vega_datasets import data # Load vega_datasets
import altair as alt
import persist_ext as PR # Load Persist Extension

cars_df = data.cars() # Get the cars dataset as Pandas dataframe

brush = alt.selection_interval(name="selection")

chart = alt.Chart().mark_point().encode(
    x="Weight_in_lbs:Q",
    y="Miles_per_Gallon:Q",
    color=alt.condition(brush, "Origin:N", alt.value("lightgray"))
).add_params(
    brush
)

PR.PersistChart(chart, data=cars_df)
```

https://github.com/visdesignlab/persist/assets/14944083/fadd5e6a-d6b6-4513-a94c-43b54ad4d047

#### Composite Vega-Altair Charts

[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/visdesignlab/persist/HEAD?labpath=examples%2Fgetting_started_composite_vega_altair_charts.ipynb)

Persist also supports composite Vega-Altair charts.

```python
from vega_datasets import data # Load vega_datasets
import altair as alt
import persist_ext as PR # Load Persist Extension

movies_df = data.movies() # Get the cars dataset as Pandas dataframe

pts = alt.selection_point(name="selection", fields=["Major_Genre"])

rect = alt.Chart().mark_rect().encode(
    alt.X('IMDB_Rating:Q').bin(),
    alt.Y('Rotten_Tomatoes_Rating:Q').bin(),
    alt.Color('count()').scale(scheme='greenblue').title('Total Records')
)

circ = rect.mark_point().encode(
    alt.ColorValue('grey'),
    alt.Size('count()').title('Records in Selection')
).transform_filter(
    pts
)

bar = alt.Chart(width=550, height=200).mark_bar().encode(
    x='Major_Genre:N',
    y='count()',
    color=alt.condition(pts, alt.ColorValue("steelblue"), alt.ColorValue("grey"))
).add_params(pts)

chart = alt.vconcat(
    rect + circ,
    bar
).resolve_legend(
    color="independent",
    size="independent",
)

PR.PersistChart(chart, data=movies_df)
```

https://github.com/visdesignlab/persist/assets/14944083/2808e722-f908-4cf9-8f66-5f2d90c5460d

#### Caveats on using Vega-Altair and Persist

Persist works with Vega-Altair charts directly for the most part. Vega-Altair and Vega-Lite offer multiple ways to write a specification. However, Persist has certain requirements that need to be fulfilled.

- The selection parameters in the chart should be named. Vega-Altair's default behavior is to generate a name of the selection parameter with an auto-incremented numeric suffix. The value of the generated selection parameter keeps incrementing on subsequent re-executions of the cell. Persist relies on consistent names to replay the interactions, and passing the name parameter fixes allows Persist to work reliably.

- The point selections should have at least the field attribute specified. Vega-Altair supports selections without fields by using auto-generated indices to define them. The indices are generated in the source dataset in the default order of rows. Using the indices directly for selection can cause Persist to operate on incorrect rows if the source dataset order changes.

- Dealing with datetime in Pandas is challenging. To standardize the way datetime conversion takes place within VegaLite and Pandas when using Vega-Altair, the TimeUnit transforms, and encodings must be specified in UTC. e.g `month(Date)` should be `utcmonth(Date)`.

### Publication

Persist is developed as part of a [publication](https://osf.io/preprints/osf/9x8eq) and will appear in EuroVis 2024.

![Teaser image from the pre-print. The figure describes the workflow showing high level working of Persist technique.](public/imgs/teaser.png)

### Supplementary Material

Supplementary material including example notebooks, walkthrough notebooks, notebooks used in the study (including participant notebooks) and the analysis notebooks can be accessed [here](https://github.com/visdesignlab/persist_examples).

#### Abstract

> Computational notebooks, such as Jupyter, support rich data visualization. However, even when visualizations in notebooks are interactive, they still are a dead end: Interactive data manipulations, such as selections, applying labels, filters, categorizations, or fixes to column or cell values, could be efficiently apply in interactive visual components, but interactive components typically cannot manipulate Python data structures. Furthermore, actions performed in interactive plots are volatile, i.e., they are lost as soon as the cell is re-run, prohibiting reusability and reproducibility. To remedy this, we introduce Persist, a family of techniques to capture and apply interaction provenance to enable persistence of interactions. When interactions manipulate data, we make the transformed data available in dataframes that can be accessed in downstream code cells. We implement our approach as a JupyterLab extension that supports tracking interactions in Vega-Altair plots and in a data table view. Persist can re-execute the interaction provenance when a notebook or a cell is re-executed enabling reproducibility and re-use.
>
> We evaluated Persist in a user study targeting data manipulations with 11 participants skilled in Python and Pandas, comparing it to traditional code-based approaches. Participants were consistently faster with Persist, were able to correctly complete more tasks, and expressed a strong preference for Persist.

## Contributing

Persist uses [hatch](https://hatch.pypa.io/latest/) to manage the development, build and publish workflows. You can install `hatch` using `pipx`, `pip` or Homebrew (on MacOS or Unix).

##### **pipx**

Install `hatch` globally in isolated environment. We recommend this way.

```bash
pipx install hatch
```

##### **pip**

Install hatch in the current Python environment.

_**WARNING**_: This may change the system Python installation.

```bash
pip install hatch
```

##### **Homebrew**

```bash
pip install hatch
```

Jupyter extensions use a custom version of `yarn` package manager called `jlpm`. When any relevant command is run, `hatch` should automatically install and setup up `jlpm`.
After installing `hatch` with your preferred method follow instructions below for workflow you want. We prefix all commands with `hatch run` to ensure they are run in proper environments.

### Development in JupyterLab

Run the `setup` script from `package.json`:

```bash
hatch run jlpm setup
```

When setup is completed, open three terminal windows and run the follow per terminal.

#### Widgets

Setup vite dev server to build the widgets

```bash
hatch run watch_widgets
```

#### Extension

Start dev server to watch and build the extension

```bash
hatch run watch_extension
```

#### Lab

Run JupyterLab server with `minimize` flag set to `false`, which gives better stack traces aqnd debugging experience.

```bash
hatch run run_lab
```

### Build

To build the extension as a standalone Python package, run:

```bash
hatch run build_extension
```

### Publish

To publish the extension, first we create a proper version. We can run any of the following

```bash
hatch version patch # x.x.1
hatch version minor # x.1.x
hatch version major # 1.x.x
```

You can also append release candidate label:

```bash
hatch version rc
```

Finally you can directly specify the exact version:

```bash
hatch version "1.3.0"
```

Once the proper version is set, build the extension using the `build` workflow.

When the build is successful, you can publish the extension if you have proper authorization:

```bash
hatch publish
```

### Development in VSCode

First, build with
```bash
hatch run build_extension
```
Currently, the widget server doesn't work for VSCode, so you'll have to manually rebuild every time. For this reason, you'll want to leave dev mode off, as dev mode tries to use the widget server instead of the static build directory to import the widget.

Create a local python environment and set it as the current kernel for the Jupyter notebook in VSCode that you want to use for development. Then, inside this kernel, install `persist_ext` as an editable local package:
```bash
pip install -e .
```

After each change, you must rebuild with `hatch run build_extension` and restart the kernel in VSCode to see the changes applied.

### Acknowledgements

The widget architecture of Persist is created using [anywidget](https://github.com/manzt/anywidget) projects.

The interactive visualizations used by Persist are based on the excellent, [Vega-Lite](https://github.com/vega/vega-lite) and [Vega-Altair](https://github.com/altair-viz/altair) projects. Specifially the implementation of [JupyterChart](https://github.com/altair-viz/altair/blob/main/altair/jupyter/jupyter_chart.py) class in Vega-Altair was of great help in understanding how Vega-Altair chart can be turned into a widget. We gratefully acknowledge funding from the National Science Foundation (IIS 1751238 and CNS 213756).

<!-- ### Citing
```bibtex
@article{gadhave_2023,
 title={Persist: Persistent and Reusable Interactions in Computational Notebooks},
 url={osf.io/9x8eq},
 DOI={10.31219/osf.io/9x8eq},
 publisher={OSF Preprints},
 author={Gadhave, Kiran, Cutler, Zach and Lex, Alexander},
 year={2023},
 month={Dec}
}
``` -->
