import Chart from 'chart.js';

let drawBoxPlugin = {
  afterDraw: function (chartInstance) {
    let xScale = chartInstance.scales["x-axis-0"];
    let yScale = chartInstance.scales["y-axis-0"];
    let ctx = chartInstance.chart.ctx;

    if (chartInstance.options.drawBox) {
      for (let i = 0; i < chartInstance.options.drawBox.length; ++i) {
        let box = chartInstance.options.drawBox[i];

        let beginPixel = {
          x: xScale.getPixelForValue(box.begin.x) + 2,
          y: yScale.getPixelForValue(box.begin.y)
        };
        let endPixel = {
          x: xScale.getPixelForValue(box.end.x) + 2,
          y: yScale.getPixelForValue(box.end.y) - 3
        };

        let width = endPixel.x - beginPixel.x;
        let high = endPixel.y - beginPixel.y;

        ctx.lineWidth = 0;
        ctx.fillStyle = box.style;
        ctx.fillRect(beginPixel.x, beginPixel.y, width, high);
        ctx.stroke();
      }
    }
  }
};

Chart.pluginService.register(drawBoxPlugin);