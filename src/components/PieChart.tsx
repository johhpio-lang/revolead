import React from 'react';

interface PieChartData {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieChartData[];
  size?: number;
  showLabels?: boolean;
  title?: string;
}

const PieChart: React.FC<PieChartProps> = ({
  data,
  size = 200,
  showLabels = true,
  title
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <div className="text-center text-gray-400">
          <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-2"></div>
          <p className="text-sm">Sem dados</p>
        </div>
      </div>
    );
  }

  let cumulativePercentage = 0;
  const radius = (size - 40) / 2;
  const centerX = size / 2;
  const centerY = size / 2;

  const createPath = (percentage: number, cumulativePercentage: number) => {
    const startAngle = cumulativePercentage * 2 * Math.PI;
    const endAngle = (cumulativePercentage + percentage) * 2 * Math.PI;

    const x1 = centerX + radius * Math.cos(startAngle);
    const y1 = centerY + radius * Math.sin(startAngle);
    const x2 = centerX + radius * Math.cos(endAngle);
    const y2 = centerY + radius * Math.sin(endAngle);

    const largeArc = percentage > 0.5 ? 1 : 0;

    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  return (
    <div className="flex flex-col items-center">
      {title && (
        <h4 className="text-sm font-medium text-gray-700 mb-3 text-center">{title}</h4>
      )}

      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          {data.map((item, index) => {
            const percentage = item.value / total;
            const path = createPath(percentage, cumulativePercentage);
            cumulativePercentage += percentage;

            return (
              <path
                key={index}
                d={path}
                fill={item.color}
                stroke="white"
                strokeWidth="2"
                className="hover:opacity-80 transition-opacity cursor-pointer"
              />
            );
          })}
        </svg>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{total}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
        </div>
      </div>

      {showLabels && (
        <div className="mt-4 space-y-2 w-full">
          {data.map((item, index) => {
            const percentage = ((item.value / total) * 100).toFixed(1);
            return (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-gray-700 truncate">{item.label}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-500">
                  <span>{item.value}</span>
                  <span className="text-xs">({percentage}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PieChart;
