import { Chart } from 'chart.js';

let drawLinePlugin = {
  id: 'drawLinePlugin',
  afterDraw: function (chartInstance) {
    let xScale = chartInstance.scales.x;
    let yScale = chartInstance.scales.y;
    let ctx = chartInstance.ctx;

    if (chartInstance.options.drawLine) {
      let line = chartInstance.options.drawLine;

      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(xScale.getPixelForValue(line.begin.x), yScale.getPixelForValue(line.begin.y));
      ctx.lineTo(xScale.getPixelForValue(line.end.x), yScale.getPixelForValue(line.end.y));
      ctx.strokeStyle = line.style;
      ctx.stroke();
    }
  }
};

Chart.register(drawLinePlugin);