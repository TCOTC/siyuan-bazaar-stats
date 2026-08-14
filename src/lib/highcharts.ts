import Highcharts from 'highcharts'
import { PAPER } from './colors.ts'

Highcharts.setOptions({
  time: {
    timezone: 'Asia/Shanghai',
  },
  chart: {
    backgroundColor: 'transparent',
    style: {
      fontFamily: "'Noto Serif SC', 'Songti SC', serif",
    },
  },
  lang: {
    resetZoom: '重置缩放',
    thousandsSep: ',',
  },
  title: {
    text: undefined,
  },
  subtitle: {
    text: undefined,
  },
  tooltip: {
    backgroundColor: '#171717',
    borderWidth: 0,
    borderRadius: 0,
    style: {
      color: PAPER,
      fontFamily: "'Noto Serif SC', 'Songti SC', serif",
    },
    xDateFormat: '%Y-%m-%d %H:%M',
  },
  legend: {
    itemStyle: {
      fontWeight: 'normal',
      fontSize: '14px',
      fontFamily: "'Noto Serif SC', 'Songti SC', serif",
    },
  },
  plotOptions: {
    series: {
      animation: {
        duration: 650,
      },
      states: {
        inactive: {
          opacity: 1,
        },
      },
    },
    spline: {
      lineWidth: 3,
    },
    line: {
      lineWidth: 3,
    },
  },
  credits: {
    href: 'https://www.highcharts.com',
    text: 'Highcharts',
  },
})

export default Highcharts
