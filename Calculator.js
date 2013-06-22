var Ext = window.Ext4 || window.Ext;
var Lumenize = window.parent.Rally.data.lookback.Lumenize;

Ext.define("Calculator.TaskActualsVsPoints", {
  extend: "Rally.data.lookback.calculator.BaseCalculator",

  iterations: null,

  constructor: function ctor(config) {
    this.callParent(arguments);

    Ext.apply(this, config);
  },

  prepareChartData: function prepareChartData(store) {
    var snapshots = store.data.items;
    var ret;

    console.log(store, this.iterations);
    console.log("Snapshot Data");
    console.log(snapshots);

    ret = this.runCalculation(snapshots);

    return ret;
  },

  runCalculation: function runCalculator(snapshots) {
    var me = this;
    var seriesData = {};
    var iterationOrder = [];
    var discoveredPoints = {};
    var pointsOrder = [];
    var i, ii, j, jj, it, p;
    var p2, p25, p50, p75, p98;
    var chartData = [];

    for (it in me.iterations) {
      if (me.iterations.hasOwnProperty(it)) {
        iterationOrder.push([me.iterations[it].Name, me.iterations[it].Start]);
      }
    }

    iterationOrder.sort(function (a, b) {
      if (a[1] < b[1]) return -1;
      if (a[1] > b[1]) return 1;
      return 0;
    });
    console.log("Iteration Order", iterationOrder);

    Ext.each(snapshots, function (item) {
      if (isNaN(parseInt(item.get("Iteration") + "", 10)) || isNaN(parseInt(item.get("PlanEstimate") + "", 10))) {
        return;
      }

      var iid = me.iterations[parseInt(item.get("Iteration") + "", 10)].Name;
      var pe = parseInt(item.get("PlanEstimate") + "", 10);

      if (!seriesData.hasOwnProperty(iid)) {
        seriesData[iid] = {};
      }

      if (!seriesData[iid].hasOwnProperty(pe)) {
        seriesData[iid][pe] = [];
      }

      seriesData[iid][pe].push(item.get("TaskActualTotal"));
      discoveredPoints[pe] = 1;
    });
    console.log("Series Data", seriesData);

    Ext.each(Ext.Object.getKeys(discoveredPoints), function (item) {
      pointsOrder.push(parseInt(item + "", 10));
    });

    pointsOrder.sort(function (a, b) {
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    });
    console.log("Points Order", pointsOrder);

    p2  = Lumenize.functions.percentileCreator(2);
    p25 = Lumenize.functions.percentileCreator(25);
    p50 = Lumenize.functions.percentileCreator(50);
    p75 = Lumenize.functions.percentileCreator(75);
    p98 = Lumenize.functions.percentileCreator(98);

    for (i = 0, ii = pointsOrder.length; i < ii; i++) {
      var dataset;
      var data = {
        name: pointsOrder[i] + " Point Stories",
        type: "boxplot",
        data: []
      };

      //debugger;
      for (j = 0, jj = iterationOrder.length; j < jj; j++) {
        console.log(iterationOrder[j][0], pointsOrder[i]);

        if (!seriesData.hasOwnProperty(iterationOrder[j][0])) {
          console.log("Doesn't have this iteration");
          data.data.push([0, 0, 0, 0, 0]);
          continue;
        }

        if (!seriesData[iterationOrder[j][0]].hasOwnProperty(pointsOrder[i])) {
          console.log("Doesn't have this point value");
          data.data.push([0, 0, 0, 0, 0]);
          continue;
        }

        dataset = seriesData[iterationOrder[j][0]][pointsOrder[i]];
        if (!dataset.length) {
          console.log("No dataset");
          data.data.push([0, 0, 0, 0, 0]);
          continue;
        }

        //data.data.push([[j, p2(dataset)], [j, p25(dataset)], [j, p50(dataset)], [j, p75(dataset)], [j, p98(dataset)]]);
        data.data.push([p2(dataset), p25(dataset), p50(dataset), p75(dataset), p98(dataset)]);
      }

      chartData.push(data);
    }

    var iterations = [];
    Ext.each(iterationOrder, function (item) {
      iterations.push(item[0]);
    });

    console.log("Chart Data");
    console.dir(chartData);
    console.log("Categories");
    console.dir(iterations);

    return {
      series: chartData,
      categories: iterations
    };
  }
});
