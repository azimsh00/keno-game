import React, { useEffect, useRef } from 'react';

const PnLChart = ({ data, startingBalance }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || data.length <= 1) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // Set canvas dimensions accounting for device pixel ratio
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    // Set canvas styles
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set drawing styles
    ctx.strokeStyle = '#0f99ff';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    
    // Find max and min values for scaling
    let maxBalance = Math.max(...data.map(item => item.balance));
    let minBalance = Math.min(...data.map(item => item.balance));
    
    // Add padding to min/max for better visualization
    const padding = (maxBalance - minBalance) * 0.1;
    maxBalance += padding;
    minBalance = Math.max(0, minBalance - padding); // Don't go below 0
    
    // Define chart area dimensions
    const chartPadding = { top: 30, right: 20, bottom: 30, left: 60 };
    const chartWidth = rect.width - chartPadding.left - chartPadding.right;
    const chartHeight = rect.height - chartPadding.top - chartPadding.bottom;

    // Draw axes
    ctx.beginPath();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    
    // Y-axis
    ctx.moveTo(chartPadding.left, chartPadding.top);
    ctx.lineTo(chartPadding.left, rect.height - chartPadding.bottom);
    
    // X-axis
    ctx.moveTo(chartPadding.left, rect.height - chartPadding.bottom);
    ctx.lineTo(rect.width - chartPadding.right, rect.height - chartPadding.bottom);
    ctx.stroke();
    
    // Draw reference line for starting balance
    const startingBalanceY = rect.height - chartPadding.bottom - 
      ((startingBalance - minBalance) / (maxBalance - minBalance)) * chartHeight;
    
    ctx.beginPath();
    ctx.strokeStyle = '#777';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 3]);
    ctx.moveTo(chartPadding.left, startingBalanceY);
    ctx.lineTo(rect.width - chartPadding.right, startingBalanceY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw "Starting Balance" label
    ctx.fillStyle = '#777';
    ctx.font = '10px sans-serif';
    ctx.fillText('Starting Balance', rect.width - chartPadding.right - 100, startingBalanceY - 5);
    
    // Y-axis labels (balance values)
    ctx.fillStyle = '#999';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    
    // Draw 5 evenly spaced y-axis labels
    for (let i = 0; i <= 5; i++) {
      const value = minBalance + ((maxBalance - minBalance) * i) / 5;
      const y = rect.height - chartPadding.bottom - (chartHeight * i) / 5;
      ctx.fillText(value.toFixed(2), chartPadding.left - 5, y + 3);
      
      // Draw horizontal grid line
      ctx.beginPath();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([3, 3]);
      ctx.moveTo(chartPadding.left, y);
      ctx.lineTo(rect.width - chartPadding.right, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // X-axis labels (game numbers)
    const gameInterval = Math.max(1, Math.ceil(data.length / 10)); // Show at most 10 game labels
    ctx.textAlign = 'center';
    
    for (let i = 0; i < data.length; i += gameInterval) {
      const game = data[i].game;
      const x = chartPadding.left + (i / (data.length - 1)) * chartWidth;
      ctx.fillText(game.toString(), x, rect.height - chartPadding.bottom + 15);
      
      // Draw vertical grid line
      ctx.beginPath();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([3, 3]);
      ctx.moveTo(x, chartPadding.top);
      ctx.lineTo(x, rect.height - chartPadding.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // Draw axis labels
    ctx.fillStyle = '#999';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Game Number', rect.width / 2, rect.height - 5);
    
    ctx.save();
    ctx.translate(15, rect.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Balance', 0, 0);
    ctx.restore();
    
    // Draw data line
    ctx.beginPath();
    ctx.strokeStyle = '#0f99ff';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    
    // Move to the first point
    const firstPoint = {
      x: chartPadding.left,
      y: rect.height - chartPadding.bottom - ((data[0].balance - minBalance) / (maxBalance - minBalance)) * chartHeight
    };
    ctx.moveTo(firstPoint.x, firstPoint.y);
    
    // Draw line connecting all points
    for (let i = 1; i < data.length; i++) {
      const x = chartPadding.left + (i / (data.length - 1)) * chartWidth;
      const y = rect.height - chartPadding.bottom - 
        ((data[i].balance - minBalance) / (maxBalance - minBalance)) * chartHeight;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    
    // Draw data points
    for (let i = 0; i < data.length; i++) {
      const x = chartPadding.left + (i / (data.length - 1)) * chartWidth;
      const y = rect.height - chartPadding.bottom - 
        ((data[i].balance - minBalance) / (maxBalance - minBalance)) * chartHeight;
      
      ctx.beginPath();
      ctx.fillStyle = data[i].change >= 0 ? '#10b981' : '#ef4444';
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, [data, startingBalance]);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="pnl-canvas"
      style={{ width: '100%', height: '300px' }}
    />
  );
};

export default PnLChart;