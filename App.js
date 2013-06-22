var Ext = window.Ext4 || window.Ext;

Ext.define('CustomApp', {
  extend: 'Rally.app.App',
  componentCls: 'app',

  launch: function() {
    var me = this;

    me.addEvents(
      "iterationDataLoaded",
      "iterationDataReady"
    );

    me.on("iterationDataLoaded", Ext.bind(me._processIterationData, me));
    me.on("iterationDataReady", Ext.bind(me._renderChart, me));

    me.createChart();
  },

  createChart: function createChart() {
    var me = this;

    me.dataLoaded = false;

    me._loadIterationData();
  },

  _loadIterationData: function _loadIterationData() {
    var me = this;

    var iterationStore = Ext.create("Rally.data.WsapiDataStore", {
      model: "Iteration",
      filters: [
        {
          property: "StartDate",
          operator: ">=",
          value: Rally.util.DateTime.toIsoString(Ext.Date.add(new Date(), Ext.Date.DAY, -140))
        },
        {
          property: "EndDate",
          operator: "<=",
          value: Rally.util.DateTime.toIsoString(new Date())
        }
      ]
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

  _renderChart: function _renderChart(iterationMap) {
    var me = this;
    var pois = [];
    var iids = [];

    Ext.each("__PROJECT_OIDS_IN_SCOPE__".split(","), function (item) {
      pois.push(parseInt(item + "", 10));
    });

    Ext.each(Ext.Object.getKeys(iterationMap), function (item) {
      iids.push(parseInt(item + "", 10));
    });

    //pois = [9061887907];


    //console.log(chartData);
    //var chart = Ext.create("Rally.ui.chart.Chart", {
      //calculatorType: "Calculator.TaskActualsVsPoints",
      //storeType: "Rally.data.lookback.SnapshotStore",

      //chartConfig: chartConfig,
      //calculatorConfig: {
        //iterations: iterationMap
      //},
      //storeConfig: {
        //find: {
          //_TypeHierarchy: { $in: ['HierarchicalRequirement', 'Defect'] },
          //_ProjectHierarchy: { $in: pois },
          //ScheduleState: { $gte: "Accepted" },
          //TaskActualTotal: { $gte: 0 },
          //Iteration: { $in: iids },
          //__At: new Date()
        //},
        //fetch: ["TaskActualTotal", "PlanEstimate", "Iteration"]
      //}
    //});

    //this.add(chart);

    var sstore = Ext.create("Rally.data.lookback.SnapshotStore", {
      find: {
        _TypeHierarchy: { $in: ['HierarchicalRequirement', 'Defect'] },
        _ProjectHierarchy: { $in: pois },
        ScheduleState: { $gte: "Accepted" },
        TaskActualTotal: { $gte: 0 },
        Iteration: { $in: iids },
        __At: new Date()
      },
      fetch: ["TaskActualTotal", "PlanEstimate", "Iteration"],
    });

    sstore.load({
        callback: function (records) {
          console.log("Iteration Map", iterationMap);
          var calc = Ext.create("Calculator.TaskActualsVsPoints", {
            iterations: iterationMap
          });

          var chartData = calc.prepareChartData(sstore);

          var chartConfig = {
            chart: {
              renderTo: "chart",
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

          me.add({
            xtype: "box",
            id: "chart"
          });

          $("#chart").highcharts(chartConfig);
        }
    });
  }
});
