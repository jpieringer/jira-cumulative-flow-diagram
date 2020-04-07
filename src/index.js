import $ from 'jquery';
import Chart from 'chart.js';
import 'bootstrap/dist/css/bootstrap.css';
import moment from 'moment';
import _ from 'lodash';
import qs from 'qs';

import './chart-js-draw-line-plugin.js';
import './chart-js-draw-box-plugin.js';

let displayChart = function () {
  $("#query-builder-div").hide();
  $("#loading-div").hide();
  $("#error-div").hide();
  $("#chart-div").show();
};

let displayLoading = function () {
  $("#query-builder-div").hide();
  $("#loading-div").show();
  $("#error-div").hide();
  $("#chart-div").hide();

  $('#progressbar').attr('aria-valuenow', 0).css('width', 0);
};

let trackProgress = function (increment) {
  let progress = parseFloat($('#progressbar').attr('aria-valuenow')) + increment;
  $('#progressbar').attr('aria-valuenow', progress).css('width', progress + "%");
};

let displayQueryBuilder = function () {
  $("#query-builder-div").show();
  $("#loading-div").hide();
  $("#error-div").hide();
  $("#chart-div").hide();
}

let displayError = function (errorMessage) {
  $("#query-builder-div").hide();
  $("#loading-div").hide();
  $("#chart-div").hide();
  $("#error-div").show();
  $("#errormessage").text(errorMessage);
};

let dateToString = function (date) {
  return moment(date).format('YYYY-MM-DD');
};

let getDays = function (startDate, endDate, nonWorkingDays) {
  let days = [];

  let currentDate = moment(startDate);
  while (currentDate.isSameOrBefore(endDate)) {
    if (currentDate.day() >= 1 && currentDate.day() <= 5 && (nonWorkingDays.length === 0 || _.every(nonWorkingDays, ignoreDate => !moment(ignoreDate).isSame(currentDate)))) {
      days.push(dateToString(currentDate));
    }
    currentDate.add(1, 'days');
  }

  return days;
};

let formatDays = function (days) {
  return _.map(days, day => moment(day).format('dd D.M'));
};

let getStateIndex =   function (states, state) {
  for (let stateIndex = 0; stateIndex < states.length; ++stateIndex) {
    if (states[stateIndex] === state) {
      return stateIndex;
    }
  }

  displayError("State " + state + " not found");
}

let getJiraIssues = function (jiraUrl, jiraQuery, startAt) {
  let promise = new Promise(function (resolve, reject) {
    $.ajax({
      "url": jiraUrl + "rest/api/2/search",
      "method": "GET",
      "headers": {
        "Content-Type": "application/json",
      },
      "data": {
        jql: jiraQuery,
        expand: 'changelog',
        fields: 'created,status',
        startAt: startAt
      }
    }).then(function success(data, message, xhr) {
      console.log("Received issues: ");
      console.log(data);

      if (data.total > data.maxResults + startAt) {
        console.log("To many issues found, continue with query: total: " + data.total + ", maxResult: " + data.maxResults + ", startAt: " + startAt);
        getJiraIssues(jiraUrl, jiraQuery, startAt + data.maxResults)
        .then(function success(innerData) {
          data.maxResults += innerData.maxResults;
          data.issues = _.concat(data.issues, innerData.issues);
          resolve(data);
        }, function error() {
          displayError("Could not access Jira. Are you logged on?");
          reject();
        });
      } else {
        trackProgress(100);
        resolve(data);
      }
    }, function error() {
      displayError("Could not access Jira. Are you logged on?");
      reject();
    });
  });

  return promise;
};

let retrieveStateDataSets = function (jiraUrl, jiraQuery, states, colors, days, lastDay) {
  let promise = new Promise(function (resolve, reject) {

    getJiraIssues(jiraUrl, jiraQuery, 0).then(function (data) {

      let processedIssues = [];
       for (let issueIndex = 0; issueIndex < data.issues.length; ++issueIndex) {
        let rawIssue = data.issues[issueIndex];

        if (rawIssue.changelog.total > rawIssue.changelog.maxResults) {
          console.log("To many history entries found for: " + rawIssue.key + " total: " + rawIssue.changelog.total + ", maxResult: " + rawIssue.changelog.maxResults);
        }

        let processedIssue = {
          key: rawIssue.key,
          changelog:
          [{
            state: _.last(states),
            created: rawIssue.fields.created
          }]
        };

        for (let changelogEntryIndex = 0; changelogEntryIndex < rawIssue.changelog.histories.length; changelogEntryIndex++) {
          let rawChangelogEntry = rawIssue.changelog.histories[changelogEntryIndex];

          for (let itemIndex = 0; itemIndex < rawChangelogEntry.items.length; ++itemIndex) {
            if (rawChangelogEntry.items[itemIndex].field === "status") {
              processedIssue.changelog.push({
                state: rawChangelogEntry.items[itemIndex].toString,
                created: rawChangelogEntry.created
              });
            }
          }
        }

        processedIssues.push(processedIssue);
      }

      // Replace multiple transitions per day with the last one
      for (let issueIndex = 0; issueIndex < processedIssues.length; ++issueIndex) {
        let issue = processedIssues[issueIndex];

        let transitionPerDay = [_.last(issue.changelog)];

        for (let changelogEntryIndex = issue.changelog.length - 1; changelogEntryIndex >= 0; changelogEntryIndex--) {
          if (!moment(_.last(transitionPerDay).created).isSame(issue.changelog[changelogEntryIndex].created, 'day')) {
            transitionPerDay = _.concat(issue.changelog[changelogEntryIndex], transitionPerDay);
          }
        }

        issue.changelog = transitionPerDay;
      }

      // Create dataset
      let datasets = [];
      for (let stateIndex = 0; stateIndex < states.length; ++stateIndex) {
        datasets[stateIndex] = {
          label: states[stateIndex],
          backgroundColor: colors[stateIndex],
          data: _.fill(Array(days.length), 0)
        };
      }

      // Transfer transitions to dataset
      for (let issueIndex = 0; issueIndex < processedIssues.length; ++issueIndex) {
        let issue = processedIssues[issueIndex];

        let changelogIndex = 0;
        for (let dayIndex = 0; dayIndex < days.length; ++dayIndex) {
          let day = days[dayIndex];
          let changelogEntry = issue.changelog[changelogIndex];

          if (moment(day).isBefore(changelogEntry.created, 'day') || moment(day).isAfter(moment(), 'day')) {
            // Before created -> do nothing
          } else if (moment(day).isSame(changelogEntry.created, 'day')) {
            // Same as created -> increase
            let stateIndex = getStateIndex(states, changelogEntry.state);
            datasets[stateIndex].data[dayIndex] = datasets[stateIndex].data[dayIndex] + 1;
          } else {
            // After created -> incrase or move on
            let nextChangelogIndex = changelogIndex + 1;
           while (nextChangelogIndex < issue.changelog.length && moment(issue.changelog[nextChangelogIndex].created).isSameOrBefore(day, 'day')) {
              changelogIndex = nextChangelogIndex;
              nextChangelogIndex = changelogIndex + 1;
            }

            changelogEntry = issue.changelog[changelogIndex];
            let stateIndex = getStateIndex(states, changelogEntry.state);
            datasets[stateIndex].data[dayIndex] = datasets[stateIndex].data[dayIndex] + 1;

          }
        }
      }

      resolve({ datasets: datasets, days: days });
    });
  });

  return promise;
};

let getFilterFromJira = function (jiraUrl, jiraFilter) {
  let promise = new Promise(function (resolve, reject) {
    $.ajax({
      "url": jiraUrl + "rest/api/2/filter/" + jiraFilter,
      "method": "GET",
      "headers": {
        "Content-Type": "application/json",
      }
    }).then(function success(data, message, xhr) {
      console.log("Received filter: " + data.jql);
      resolve(data.jql);
    }, function error() {
      displayError("Could not access Jira. Are you logged on?");
      reject();
    });
  });

  return promise;
};

let getSprintFromJira = function (jiraUrl, jiraSprint) {
  let promise = new Promise(function (resolve, reject) {
    $.ajax({
      "url": jiraUrl + "/rest/agile/1.0/sprint/" + jiraSprint,
      "method": "GET",
      "headers": {
        "Content-Type": "application/json",
      }
    }).then(function success(data, message, xhr) {
      console.log("Received sprint: " + data);
      resolve(data);
    }, function error() {
      displayError("Could not access Jira. Are you logged on?");
      reject();
    });
  });

  return promise;
};

let getBoardFromJira = function (jiraUrl, jiraBoard) {
  let promise = new Promise(function (resolve, reject) {
    $.ajax({
      "url": jiraUrl + "/rest/agile/1.0/board/" + jiraBoard + "/sprint?state=active",
      "method": "GET",
      "headers": {
        "Content-Type": "application/json",
      }
    }).then(function success(data, message, xhr) {
      console.log("Received board: " + data);
      resolve(data);
    }, function error() {
      displayError("Could not access Jira. Are you logged on?");
      reject();
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
};

let getTodayIndexIfInData = function (days) {
  let today = dateToString(moment().millisecond(0).second(0).minute(0).hour(0));

  return _.indexOf(days, today);
};

let getTargetIssueCount = function (datasets, days) {
  let targetIssueCount = 0;

  let targetDay = getLastDayWithData(days);
  let targetDayIndex = _.indexOf(days, targetDay);

  for (let datasetIndex = 0; datasetIndex < datasets.length; ++datasetIndex) {
    targetIssueCount += datasets[datasetIndex].data[targetDayIndex];
  }

  return targetIssueCount;
};

let createDeepLink = function (settings) {
  let baseUrl = window.location.origin + window.location.pathname;
  return baseUrl + "?" + qs.stringify(settings);
};

let createLink = function () {
  let deepLink = createDeepLink(JSON.parse($('#settingsTextArea').val()));
  window.location.replace(deepLink);
};

let parseQueryParameters = function () {
  let queryString = location.search.slice(1);
  return qs.parse(queryString);
};

let hasQueryParameters = function () {
  return _.trim(location.search.slice(1));
};

let changeSettings = function () {
  $('#settingsTextArea').val(JSON.stringify(qs.parse(location.search.slice(1)), null, 2));
  displayQueryBuilder();
};

let buildAndDisplayChart = function (data) {
  let targetIssueCount = getTargetIssueCount(data.datasets, data.days);
  let xAxisLabels = formatDays(data.days);

  let lastDay = getLastDayWithData(data.days);
  let lastDayIndex = _.indexOf(data.days, lastDay);

  let todayIndex = getTodayIndexIfInData(data.days)

  let chartCanvas = document.getElementById('chart').getContext('2d');
  let chart = new Chart(chartCanvas, {
    type: 'line',
    data: {
      labels: xAxisLabels,
      datasets: data.datasets
    },
    options: {
      scales: {
        yAxes: [{
          stacked: true,
          ticks: {
            min: 0
          }
        }],
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
      },
      drawBox: [
        {
          begin: { x: xAxisLabels[lastDayIndex], y: 0 },
          end: { x: xAxisLabels[lastDayIndex + 1], y: targetIssueCount },
          style: "rgba(255, 255, 255, 1)"
        },
        {
          begin: { x: xAxisLabels[todayIndex - 1], y: 0 },
          end: { x: xAxisLabels[todayIndex], y: targetIssueCount },
          style: "rgba(255, 255, 255, 0.6)"
        }]
    }
  });

  displayChart();
};

let getDataAndBuildChart = function (settings) {
  let states = _.map(settings.states, x => x.state);
  let colors = _.map(settings.states, x => x.color);

  let startDate = settings.startDate;
  let endDate = settings.endDate;
  let nonWorkingDays = settings.nonWorkingDays || [];
  let sprint = settings.jiraSprint;
  let jql = settings.jiraQuery;

  let processBoard = function () {
    return new Promise(function (resolve, reject) {
      if (typeof settings.jiraBoard !== "undefined") {
        getBoardFromJira(settings.jiraUrl, settings.jiraBoard).then(function (data) {
          if (data.values.length !== 1) {
            console.log(data);
            displayError(data.values.length + " sprints were found. Only one sprint is allowed.");
            reject();
          } else {
            sprint = data.values[0].id;
            resolve();
          }
        });
      } else {
        resolve();
      }
    })
  };

  let processSprint = function () {
    return new Promise(function (resolve, reject) {
      if (typeof sprint !== "undefined") {
        getSprintFromJira(settings.jiraUrl, sprint).then(function (data) {
          startDate = startDate || dateToString(moment(data.startDate));
          endDate = endDate || dateToString(moment(data.endDate));
          jql = jql || "sprint = " + data.id;
          resolve();
        });
      } else {
        resolve();
      }
    })
  };

  let processFilter = function () {
    return new Promise(function (resolve, reject) {
      if (typeof settings.jiraFilter !== "undefined") {
        getFilterFromJira(settings.jiraUrl, settings.jiraFilter).then(function (filterJql) {
          jql = jql || filterJql;
          resolve();
        });
      } else {
        resolve();
      }
    })
  };

  processFilter()
    .then(function () {
      return processBoard();
    }).then(function () {
      return processSprint();
    }).then(function () {
      let days = getDays(startDate, endDate, nonWorkingDays);
      let lastDay = getLastDayWithData(days);

      displayLoading(days.length);
      retrieveStateDataSets(settings.jiraUrl, jql, states, colors, days, lastDay).then(buildAndDisplayChart);
    });
};

if (hasQueryParameters()) {
  let settings = parseQueryParameters();
  console.log(settings);
  getDataAndBuildChart(settings);
} else {
  $('#settingsTextArea').val(JSON.stringify(
    {
      jiraUrl: "https://jira-cfd.atlassian.net/",
      jiraQuery: "project = CFDTES",
      startDate: '2017-01-02',
      endDate: '2017-01-28',
      nonWorkingDays: ['2017-01-23'],
      states: [
        { state: 'Done', color: 'rgba(153,255,51,1)' },
        { state: 'In Progress', color: 'rgba(255,153,0,1)' },
        { state: 'To Do', color: 'rgba(0,153,0,1)' }
      ]
    }, null, 2));

  displayQueryBuilder();
}

$("#createLink").click(createLink);
$("#changeSettings").click(changeSettings);
$("#changeSettingsAfterError").click(changeSettings);
