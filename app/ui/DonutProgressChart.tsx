import Chart from 'react-apexcharts';

export const DonutProgressChart = ({
  progress,
  label = '',
  width,
  valueSize = '13px',
}: {
  progress: number;
  label?: string;
  width: number;
  valueSize: string;
}) => {
  return (
    <div>
      <Chart
        series={[progress]}
        type="radialBar"
        width={width}
        options={{
          plotOptions: {
            radialBar: {
              startAngle: 0,
              endAngle: 360,
              hollow: {
                margin: 0,
                size: '65%',
                background: '#fff',
                image: undefined,
                imageOffsetX: 0,
                imageOffsetY: 0,
                position: 'front',
                dropShadow: {
                  enabled: true,
                  top: 3,
                  left: 0,
                  blur: 4,
                  opacity: 0.24,
                },
              },
              track: {
                background: '#fff',
                strokeWidth: '67%',
                margin: 0, // margin is in pixels
                dropShadow: {
                  enabled: true,
                  top: -3,
                  left: 0,
                  blur: 4,
                  opacity: 0.35,
                },
              },

              dataLabels: {
                name: {
                  offsetY: -20,
                  show: true,
                  color: '#888',
                  fontSize: valueSize,
                },
                value: {
                  formatter: (v: number): string => `${v}%`,
                  fontSize: valueSize,
                  offsetY: -12,
                  show: true,
                },
              },
            },
          },
          fill: {
            type: 'gradient',
            gradient: {
              shade: 'dark',
              type: 'horizontal',
              shadeIntensity: 0.5,
              gradientToColors: ['#ABE5A1'],
              inverseColors: true,
              opacityFrom: 1,
              opacityTo: 1,
              stops: [0, 100],
            },
          },
          stroke: {
            lineCap: 'round',
          },
          labels: [label],
        }}
      />
    </div>
  );
};
