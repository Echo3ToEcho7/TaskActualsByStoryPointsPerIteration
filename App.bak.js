var Ext = window.Ext4 || window.Ext;

Ext.define('CustomApp', {
  extend: 'Rally.app.App',
  componentCls: 'app',

  launch: function() {
    var me = this;

    me.addEvents(
      "snapshotDataLoaded",
      "snapshotDataReady",
      "iterationDataLoaded",
      "iterationDataReady"
    );

    me.on("snapshotDataLoaded", Ext.bind(me._processSnapshotData, me));
    me.on("snapshotDataReady", Ext.bind(me._loadIterationData, me));
    me.on("iterationDataLoaded", Ext.bind(me._processIterationData, me));
    me.on("iterationDataReady", Ext.bind(me._renderChart, me));

    me.createChart();
  },

  createChart: function createChart() {
    var me = this;

    me.dataLoaded = false;

    me._loadSnapshotData();
  },

  _loadSnapshotData: function _loadSnapshotData() {
    var me = this;
    var pois = [];

    Ext.each("__PROJECT_OIDS_IN_SCOPE__".split(","), function (item) {
      pois.push(parseInt(item + "", 10));
    });

    pois = [9061887907];

    var snapshotStore = Ext.create('Rally.data.lookback.SnapshotStore', {
      context: this.getContext().getDataContext(),
      fetch: ["Iteration", "TaskActualTotal", "PlanEstimate"],
      hydrate: ["Iteration"],
      filters: [
        {
          property: '_TypeHierarchy',
          operator: 'in',
          value: ['HierarchicalRequirement', 'Defect']
        },
        {
          property: "_ProjectHierarchy",
          operator: "in",
          value: pois
        },
        {
          property: 'ScheduleState',
          operator: '>=',
          value: 'Accepted'
        },
        {
          property: "TaskActualTotal",
          operator: ">",
          value: 0
        },
        {
          property: "__At",
          value: new Date()
        }
      ]
    });

    snapshotStore.load({
      callback: function (records) {
        me.fireEvent("snapshotDataLoaded", records, snapshotStore);
      }
    });
  },

  _processSnapshotData: function _processSnapshotData(records, snapshotStore) {
    var me = this;
    var iters = {};

    me.snapshotStore = snapshotStore;

    Ext.each(records, function(rec) {
      if (!isNaN(parseInt(rec.get("Iteration") + "", 10))) {
        iters[parseInt(rec.get("Iteration") + "", 10)] = 1;
      }
    });

    console.log("Snapshot Data", records, iters);
    me.fireEvent("snapshotDataReady", iters);
  },

  _loadIterationData: function _loadIterationData(iterations) {
    var me = this;
    var query = [];
    var k;

    for (k in iterations) {
      if (iterations.hasOwnProperty(k)) {
        query.push({
          property: "ObjectID",
          value: k
        });
      }
    }

    var iterationStore = Ext.create("Rally.data.WsapiDataStore", {
      model: "Iteration",
      filters: Rally.data.QueryFilter.or(query)
    });

    iterationStore.load({
      callback: function (records) {
        me.fireEvent("iterationDataLoaded", records, iterationStore);
      }
    });
  },

  _processIterationData: function _processIterationData(records, iterationStore) {
    var me = this;
    var imap = {};

    me.iterationStore = iterationStore;

    Ext.each(records, function(rec) {
      imap[parseInt(rec.get("ObjectID") + "", 10)] = { 
        Name: rec.get("Name"),
        Start: rec.get("StartDate"),
        End: rec.get("EndDate")
      };
    });

    console.log("Iteration Map", imap);
    me.fireEvent("iterationDataReady", imap);
  },

  _calculateData: function(snapshotStore, iterationMap) {
    var calc = Ext.create("Calculator.TaskActualsVsPoints", {
      iterations: iterationMap
    });

    return calc.prepareChartData(snapshotStore);
  },

  _renderChart: function _renderChart(iterationMap) {
    var chartData = this._calculateData(this.snapshotStore, iterationMap);
    var chartConfig = {
      chart: {
        type: "boxplot"
      },
      title: {
        text: "Task Actuals per Iteration by Story Point Estimate"
      },
      ledgend: {
        enabled: true
      },
      xAxis: {
        categories: chartData.categories,
        title: {
          text: "Iterations"
        }
      },
      yAxis: {
        title: {
          text: "Task Actuals (h)"
        }
      },
      series: chartData.series
    };

    console.log(chartData);
    var chart = Ext.create("Rally.ui.chart.Chart", {
      chartConfig: chartConfig,
      chartData: chartData
    });

    this.add(chart);


  }
});
