

console.log("script.js loaded");

const EMBEDDINGS_CSV = "data/embeddings_2d_sampled_30k.csv";
const NTA_GEOJSON = "data/nyc_nta.geojson";

const dashboardSpec = {
  $schema: "https://vega.github.io/schema/vega-lite/v5.json",
  description:
    "NYC DOB filings: PCA embedding with linked monthly trends, dwelling-unit changes, and NTA map.",

  background: "white",

  data: { url: EMBEDDINGS_CSV },

  // Compute year-month once so all views can share it
  transform: [
    {
      timeUnit: "yearmonth",
      field: "Filing Date",
      as: "ym",
    },
  ],

  resolve: {
    scale: { color: "independent" },
  },

  vconcat: [
   
    // 1) PCA Embedding scatterplot (defines embedBrush + jobTypeSel)
    
    {
      width: 1200,
      height: 360,
      title: {
        text: "NYC DOB Filings – Embedding Space (PCA)",
        anchor: "start",
        fontSize: 16,
      },

      selection: {
        embedBrush: { type: "interval" },
        jobTypeSel: {
          type: "multi",
          fields: ["Job Type"],
          bind: "legend",
          empty: "all",
        },
      },

      transform: [
        { filter: { selection: "jobTypeSel" } },
        { filter: { selection: "monthBrush" } },
        { filter: { selection: "ntaSel" } },
      ],

      mark: {
        type: "point",
        filled: true,
        size: 12,
      },

      encoding: {
        x: {
          field: "x_pca",
          type: "quantitative",
          title: "Embedding dimension 1 (PCA 1)",
          axis: { grid: true },
        },
        y: {
          field: "y_pca",
          type: "quantitative",
          title: "Embedding dimension 2 (PCA 2)",
          axis: { grid: true },
        },

        color: {
          field: "Job Type",
          type: "nominal",
          title: "Job type",
          legend: {
            title: "Job type",
            orient: "right",
          },
          scale: { scheme: "tableau10" },
        },

        opacity: {
          condition: { selection: "embedBrush", value: 0.9 },
          value: 0.12,
        },

        tooltip: [
          { field: "filing_id", title: "Filing ID" },
          { field: "Job Type", title: "Job type" },
          { field: "Borough", title: "Borough" },
          { field: "NTA", title: "NTA" },
          { field: "Filing Date", title: "Filing date", type: "temporal" },
          {
            field: "delta_units",
            title: "Δ dwelling units",
            type: "quantitative",
            format: ",d",
          },
          {
            field: "Initial Cost",
            title: "Initial cost (USD)",
            type: "quantitative",
            format: ",.0f",
          },
          {
            field: "FloorArea_imputed",
            title: "Floor area (sq ft, imputed)",
            type: "quantitative",
            format: ",.0f",
          },
          {
            field: "approval_days_cap",
            title: "Approval time (days, capped)",
            type: "quantitative",
            format: ",d",
          },
          {
            field: "Latitude",
            title: "Latitude",
            type: "quantitative",
            format: ".4f",
          },
          {
            field: "Longitude",
            title: "Longitude",
            type: "quantitative",
            format: ".4f",
          },
        ],
      },
    },

   
    // 2) Monthly filings – overview + detail with monthBrush
    
    {
      hconcat: [
        {
          vconcat: [
            {
              width: 800,
              height: 180,
              title: {
                text: "Monthly filings by job type (filtered by embedding, NTA map & month range)",
                anchor: "start",
                fontSize: 14,
              },

              transform: [
                { filter: { selection: "jobTypeSel" } },
                { filter: { selection: "embedBrush" } },
                { filter: { selection: "monthBrush" } },
                { filter: { selection: "ntaSel" } },
              ],

              mark: { type: "line" },

              encoding: {
                x: {
                  field: "ym",
                  type: "temporal",
                  title: "Filing month",
                  axis: {
                    format: "%Y-%m",
                    labelAngle: -40,
                  },
                },
                y: {
                  aggregate: "count",
                  field: "filing_id",
                  type: "quantitative",
                  title: "Filings (count)",
                  axis: { format: ",d", grid: true },
                },
                color: {
                  field: "Job Type",
                  type: "nominal",
                  title: "Job type",
                  legend: null,
                  scale: { scheme: "tableau10" },
                },
                tooltip: [
                  {
                    field: "ym",
                    type: "temporal",
                    title: "Month",
                    format: "%b %Y",
                  },
                  { field: "Job Type", type: "nominal", title: "Job type" },
                  {
                    aggregate: "count",
                    field: "filing_id",
                    type: "quantitative",
                    title: "Filings (count)",
                    format: ",d",
                  },
                ],
              },
            },

            {
              width: 800,
              height: 80,
              title: {
                text: "Month range – brush to filter all views",
                anchor: "start",
                fontSize: 13,
              },

              selection: {
                monthBrush: { type: "interval", encodings: ["x"] },
              },

              transform: [
                { filter: { selection: "jobTypeSel" } },
                { filter: { selection: "ntaSel" } },
              ],

              mark: { type: "area", opacity: 0.6 },

              encoding: {
                x: {
                  field: "ym",
                  type: "temporal",
                  title: "Filing month",
                  axis: {
                    format: "%Y-%m",
                    labelAngle: -40,
                  },
                },
                y: {
                  aggregate: "count",
                  field: "filing_id",
                  type: "quantitative",
                  title: "Total filings",
                  axis: { format: ",d" },
                },
                tooltip: [
                  {
                    field: "ym",
                    type: "temporal",
                    title: "Month",
                    format: "%b %Y",
                  },
                  {
                    aggregate: "count",
                    field: "filing_id",
                    type: "quantitative",
                    title: "Filings (count)",
                    format: ",d",
                  },
                ],
              },
            },
          ],
        },
        
        // 4) NTA choropleth map
        
        {
          width: 500,
          height: 500,
          title: {
            text: "NTA map – filings in current selection (embedding, job type, and month filters)",
            anchor: "start",
            fontSize: 12,
          },

          transform: [
            { filter: { selection: "jobTypeSel" } },
            { filter: { selection: "embedBrush" } },
            { filter: { selection: "monthBrush" } },

            {
              aggregate: [
                { op: "count", field: "filing_id", as: "filings_selected" },
              ],
              groupby: ["NTA"],
            },

            {
              lookup: "NTA",
              from: {
                data: {
                  url: NTA_GEOJSON,
                  format: { type: "json", property: "features" },
                },
                key: "properties.NTAName",
              },
              as: "geo",
            },

            { filter: "datum.geo != null" },
          ],

          selection: {
            ntaSel: {
              type: "multi",
              fields: ["NTA"],
              empty: "all",
            },
          },

          projection: { type: "mercator" },

          mark: { type: "geoshape", stroke: "#ffffff", strokeWidth: 0.5 },

          encoding: {
            shape: { field: "geo", type: "geojson" },

            color: {
              field: "filings_selected",
              type: "quantitative",
              title: "Filings in current selection",
              scale: { type: "symlog", scheme: "viridis" },
            },

            opacity: {
              condition: { selection: "ntaSel", value: 1 },
              value: 0.7,
            },

            tooltip: [
              {
                field: "geo.properties.NTAName",
                type: "nominal",
                title: "NTA",
              },
              {
                field: "filings_selected",
                type: "quantitative",
                title: "Filings (count)",
                format: ",d",
              },
            ],
          },
        },
      ],
    },

    
    
    
    // 3) Dwelling units butterfly + Top-3 table
   
    {
      hconcat: [
        // Left: Butterfly chart 
        {
          width: 800,
          height: 240,
          title: {
            text: "Dwelling units – adds (right) vs removals (left) by borough",
            anchor: "start",
            fontSize: 14,
          },

          transform: [
            { filter: { selection: "jobTypeSel" } },
            { filter: { selection: "embedBrush" } },
            { filter: { selection: "monthBrush" } },
            { filter: { selection: "ntaSel" } },
            { filter: "isValid(datum.delta_units)" },
            {
              calculate: "datum.delta_units >= 0 ? 'Adds' : 'Removals'",
              as: "DU_type",
            },
          ],

          mark: "bar",

          encoding: {
            y: {
              field: "Borough",
              type: "nominal",
              title: "Borough",
              sort: "-x",
              axis: { labelLimit: 90 },
            },
            x: {
              aggregate: "sum",
              field: "delta_units",
              type: "quantitative",
              title: "Net dwelling units (adds right, removals left)",
              axis: { format: ",d", grid: true },
            },
            color: {
              field: "DU_type",
              type: "nominal",
              title: "Change type",
              scale: {
                domain: ["Adds", "Removals"],
                range: ["#1b9e77", "#d95f02"],
              },
              
              legend: { orient: "top", direction: "horizontal" },
            },
            tooltip: [
              { field: "Borough", type: "nominal", title: "Borough" },
              { field: "DU_type", type: "nominal", title: "Change type" },
              {
                aggregate: "sum",
                field: "delta_units",
                type: "quantitative",
                title: "Net dwelling units",
                format: ",d",
              },
            ],
          },
        },

                //  Top 3 filings by Initial Cost table 
               
        {
          width: 560,
          height: 240,
          title: {
            text: "Top 3 filings by initial cost (current selection)",
            anchor: "start",
            fontSize: 14,
          },

          transform: [
            // linked filters
            { filter: { selection: "jobTypeSel" } },
            { filter: { selection: "embedBrush" } },
            { filter: { selection: "monthBrush" } },
            { filter: "isValid(datum['Initial Cost'])" },

            // numeric cost
            {
              calculate: "toNumber(datum['Initial Cost'])",
              as: "InitialCostNum",
            },

           
            {
              aggregate: [
                { op: "max", field: "InitialCostNum", as: "InitialCostNum" }
              ],
              groupby: [
                "filing_id",
                "Filing Date",
                "Job Type",
                "Borough",
                "NTA"
              ]
            },

            // rank by cost (desc)
            {
              window: [{ op: "row_number", as: "rank" }],
              sort: [{ field: "InitialCostNum", order: "descending" }],
            },
            { filter: "datum.rank <= 3" },

           
            { calculate: "datum.filing_id", as: "Filing Number" },
            {
              calculate: "timeFormat(datum['Filing Date'], '%Y-%m-%d %H:%M')",
              as: "Filing Date",
            },
            { calculate: "datum['Job Type']", as: "Job Type" },
            {
              calculate: "format(datum.InitialCostNum, ',.0f')",
              as: "Initial Cost (USD)",
            },
            { calculate: "datum.Borough", as: "Borough" },
            { calculate: "datum.NTA", as: "NTA" },

         
            {
              fold: [
                "Filing Number",
                "Filing Date",
                "Job Type",
                "Initial Cost (USD)",
                "Borough",
                "NTA",
              ],
              as: ["field", "value"],
            },
          ],

          facet: {
            column: {
              field: "field",
              type: "nominal",
              title: null,
              sort: [
                "Filing Number",
                "Filing Date",
                "Job Type",
                "Initial Cost (USD)",
                "Borough",
                "NTA",
              ],
              header: {
                labelAngle: 0,
                labelFontSize: 11,
                labelAlign: "left",
                labelAnchor: "start",
              },
            },
          },

          spacing: 4,

          spec: {
            mark: {
              type: "text",
              align: "left",
              baseline: "middle",
              dx: 4,
            },

            encoding: {
              y: {
                field: "rank",
                type: "ordinal",
                axis: {
                  title: null,
                  ticks: false,
                  labels: false,
                },
              },
              text: { field: "value", type: "nominal" },

              tooltip: [
                { field: "Filing Number", type: "nominal", title: "Filing number" },
                { field: "Filing Date", type: "nominal", title: "Filing date" },
                { field: "Job Type", type: "nominal", title: "Job type" },
                {
                  field: "Initial Cost (USD)",
                  type: "nominal",
                  title: "Initial cost (USD)",
                },
                { field: "Borough", type: "nominal", title: "Borough" },
                { field: "NTA", type: "nominal", title: "NTA" },
              ],
            },
          },
        },


      ],
    },

    
    //  VIEW – Work-type composition by borough (linked to all selections)
    {
      width: 700,
      height: 220,
      title: {
        text: "Work-type composition by borough (current selection)",
        anchor: "start",
        fontSize: 14,
      },

      transform: [
        // Link to existing selections
        { filter: { selection: "jobTypeSel" } },
        { filter: { selection: "embedBrush" } },
        { filter: { selection: "monthBrush" } },
        { filter: { selection: "ntaSel" } },

        {
          fold: [
            "Sprinkler (Work Type)",
            "Plumbing (Work Type)",
            "Standpipe",
            "Antenna",
            "Curb Cut",
            "Sign",
            "Fence",
            "Scaffold",
            "Shed",
            "Boiler Equipment (Work Type)",
            "Earth Work (Work Type)",
            "Foundation (Work Type)",
            "General Construction (Work Type)",
            "Mechanical Systems (Work Type)",
            "Place of Assembly (Work Type)",
            "Protection Mechanical Methods (Work Type)",
            "Sidewalk Shed (Work Type)",
            "Structural (Work Type)",
            "Temporary Place of Assembly (Work Type)",
          ],
          as: ["WorkTypeRaw", "WorkTypeFlag"],
        },

        // Keep only filings where this work type is present (assuming 0/1 or counts)
        { filter: "datum.WorkTypeFlag > 0" },

        
        {
          calculate:
            "indexof(datum.WorkTypeRaw, ' (Work Type)') >= 0 " +
            "? substring(datum.WorkTypeRaw, 0, indexof(datum.WorkTypeRaw, ' (Work Type)')) " +
            ": datum.WorkTypeRaw",
          as: "WorkType",
        },
      ],

      mark: "bar",

      encoding: {
        y: {
          field: "Borough",
          type: "nominal",
          title: "Borough",
        },
        x: {
          aggregate: "count",
          field: "filing_id",
          type: "quantitative",
          stack: "normalize", // 0–100% stacked bars
          axis: {
            title: "Share of filings",
            format: ".0%",
          },
        },
        color: {
          field: "WorkType",
          type: "nominal",
          title: "Work type",
          legend: {
            columns: 2,
          },
          
        },
        tooltip: [
          { field: "Borough", type: "nominal", title: "Borough" },
          { field: "WorkType", type: "nominal", title: "Work type" },
          {
            aggregate: "count",
            field: "filing_id",
            type: "quantitative",
            title: "Filings (count)",
            format: ",d",
          },
        ],
      },
    },
  ],

  config: {
    view: { stroke: null },
    concat: { spacing: 16 },
    axis: {
      labelFontSize: 11,
      titleFontSize: 12,
      labelColor: "#333",
      titleColor: "#333",
    },
    legend: {
      labelFontSize: 11,
      titleFontSize: 12,
    },
  },
};

vegaEmbed("#embedding-view", dashboardSpec, { actions: false })
  .then(() => console.log("Embedding dashboard rendered."))
  .catch(console.error);
