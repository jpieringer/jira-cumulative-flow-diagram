import Chart from 'chart.js';

let drawBoxPlugin = {
  afterDraw: function (chartInstance) {
    let xScale = chartInstance.scales["x-axis-0"];
    let yScale = chartInstance.scales["y-axis-0"];
    let ctx = chartInstance.chart.ctx;

    if (chartInstance.options.drawBox) {
      let box = chartInstance.options.drawBox;

      let beginPixel = {
        x: xScale.getPixelForValue(box.begin.x)+2,
        y: yScale.getPixelForValue(box.begin.y)-1
      };
      let endPixel = {
        x: xScale.getPixelForValue(box.end.x)-2,
        y: yScale.getPixelForValue(box.end.y)+2
      };

      let width = endPixel.x - beginPixel.x;
      let high = endPixel.y - beginPixel.y;

      ctx.lineWidth = 0;
      ctx.fillStyle = "white";
      ctx.fillRect(beginPixel.x,beginPixel.y,width,high);
      ctx.stroke();
    }
  }
};

Chart.pluginService.register(drawBoxPlugin);