import 'jquery';
import Chart from 'chart.js';
import 'bootstrap/dist/css/bootstrap.css';
import moment from 'moment';
import _ from 'lodash';

import './chart-js-draw-line-plugin.js';

let dateToString = function (date) {
  return date.format('YYYY-MM-DD');
}

let getDays = function (startDate, endDate, dateIgnoreList) {
  let days = [];

  let currentDate = moment(startDate);
  while (currentDate.isSameOrBefore(endDate)) {
    if (currentDate.day() >= 1 && currentDate.day() <= 5 && !_.every(dateIgnoreList, ignoreDate => moment(ignoreDate).isSame(currentDate))) {
      days.push(dateToString(currentDate));
    }
    currentDate.add(1, 'days');
  }

  return days;
};

let formatDays = function (days) {
  return _.map(days, day => moment(day).format('dd D.M'));
}

let fillJirayQueryTemplate = function (jiraQueryTemplate, date, state) {
  let query = jiraQueryTemplate;
  query = _.replace(query, '$date', date);
  query = _.replace(query, '$date', date);
  query = _.replace(query, '$state', state);
  query = _.replace(query, '$state', state);
  return query;
}

let executeSingleJiraQuery = function (jiraQueryTemplate, date, state) {
  let promise = new Promise(function (resolve, reject) {
    $.ajax({
      "url": baseJiraUrl + "rest/api/2/search",
      "method": "GET",
      "headers": {
        "Content-Type": "application/json",
      },
      "data": {
        jql: fillJirayQueryTemplate(jiraQueryTemplate, date, state)
      }
    }).then(function success(data, message, xhr) {
      resolve({ date: date, state: state, count: data.total });
    }, function error() {
      displayError("Could not access Jira. Are you logged on?");
      reject();
    });
  });

  return promise;
};

let retrieveStateDataSets = function (jiraQueryTemplate, states, colors, days, lastDay) {
  let promise = new Promise(function (resolve, reject) {

    let queryPromisses = [];
    for (let dayIndex = 0; dayIndex <= _.indexOf(days, lastDay); dayIndex++) {
      let day = days[dayIndex];

      for (let stateIndex = 0; stateIndex < states.length; ++stateIndex) {
        let state = states[stateIndex];
        queryPromisses.push(executeSingleJiraQuery(jiraQueryTemplate, day, state));
      }
    }

    Promise.all(queryPromisses).then(function (responses) {
      console.log("Jira REST API calles finished.");

      let datasets = [];
      for (let stateIndex = 0; stateIndex < states.length; ++stateIndex) {
        let sortedResponses = _.sortBy(_.filter(responses, x => x.state === states[stateIndex]), x => _.indexOf(days, x.date));

        let filledData = _.map(sortedResponses, x => x.count);
        let paddingData = _.fill(Array(days.length - filledData.length), 0);

        datasets[stateIndex] = {
          label: states[stateIndex],
          backgroundColor: colors[stateIndex],
          data: _.concat(filledData, paddingData)
        };
      }

      resolve(datasets);
    });
  });

  return promise;
};

/**
 * Today or begin/end if it is smaller/larger
 */
let getLastDayWithData = function (days) {
  let today = moment().millisecond(0).second(0).minute(0).hour(0);
  let firstDay = moment(days[0]);
  let lastDay = moment(days[days.length - 1]);

  if (today.isSameOrBefore(firstDay)) {
    return days[0];
  }

  if (today.isSameOrAfter(lastDay)) {
    return days[days.length - 1];
  }

  let targetDay = dateToString(today.isBefore(lastDay) ? today : lastDay);
  let targetDayIndex = _.indexOf(days, targetDay);

  // Ensure we did not find a non-working-day
  while (targetDayIndex === -1) {
    targetDay = dateToString(moment(targetDay).add(-1, "days"));
    targetDayIndex = _.indexOf(days, targetDay);
  }

  return days[targetDayIndex];
}

let getTargetIssueCount = function (datasets, days) {
  let targetIssueCount = 0;

  let targetDay = getLastDayWithData(days);
  let targetDayIndex = _.indexOf(days, targetDay);

  for (let datasetIndex = 0; datasetIndex < datasets.length; ++datasetIndex) {
    targetIssueCount += datasets[datasetIndex].data[targetDayIndex];
  }

  return targetIssueCount;
}


if (1) {
  $("#help-div").hide();
  $("#chart-div").show();
  $("#error-div").hide();
} else {
  $("#help-div").show();
  $("#chart-div").hide();
  $("#error-div").hide();
}

let displayError = function (errorMessage) {
  $("#help-div").hide();
  $("#chart-div").hide();
  $("#error-div").show();
  $("#errormessage").text(errorMessage);
};

let startDate = "2017-01-01";
let endDate = "2017-01-22";
let dateIgnoreList = ["2017-01-23"];

let states = ['Done', 'In Progress', 'Open'];
let colors = ['rgba(153,255,51,1)', 'rgba(255,153,0,1)', 'rgba(0,153,0,1)'];

let baseJiraUrl = "https://jira-cfd.atlassian.net/";
let jiraQueryTemplate = "status was '$state' during ($date, $date)";

let days = getDays(startDate, endDate, dateIgnoreList);
let lastDay = getLastDayWithData(days);


retrieveStateDataSets(jiraQueryTemplate, states, colors, days, lastDay).then(function (datasets) {
  let targetIssueCount = getTargetIssueCount(datasets, days);
  let xAxisLabels = formatDays(days);

  let chartCanvas = document.getElementById('chart').getContext('2d');
  let chart = new Chart(chartCanvas, {
    type: 'line',
    data: {
      labels: xAxisLabels,
      datasets: datasets
    },
    options: {
      scales: {
        yAxes: [{
          stacked: true
        }]
      },
      legend: {
        reverse: true
      },
      elements: {
        line: {
          tension: 0
        }
      },
      drawLine: {
        begin: { x: xAxisLabels[0], y: 0 },
        end: { x: xAxisLabels[xAxisLabels.length - 1], y: targetIssueCount },
        style: "rgba(0, 0, 0, 1)"
      }
    }
  });
});
