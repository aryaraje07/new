"use client";

import React from 'react';

interface MindMapVisualizationProps {
  data: any;
  title: string;
  description: string;
}

export default function MindMapVisualization({ data, title, description }: MindMapVisualizationProps) {
  const renderMindMapContent = () => {
    if (!data) {
      return <p className="text-center text-gray-500">No mind map data available</p>;
    }

    // If data has a central topic and branches
    if (data.central && data.branches) {
      return (
        <div className="relative h-80">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
              {data.central}
            </div>
          </div>
          {data.branches.map((branch: any, index: number) => {
            const angle = (index * 360) / data.branches.length;
            const distance = 120;
            const x = Math.cos((angle * Math.PI) / 180) * distance;
            const y = Math.sin((angle * Math.PI) / 180) * distance;
            
            return (
              <div
                key={index}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                }}
              >
                <div className="bg-white border-2 border-gray-300 px-3 py-2 rounded-lg shadow-md text-xs">
                  <p className="font-semibold">{branch.title || branch.name || `Branch ${index + 1}`}</p>
                  {branch.description && (
                    <p className="text-gray-600 mt-1">{branch.description}</p>
                  )}
                </div>
                <svg
                  className="absolute top-1/2 left-1/2 w-32 h-0.5 bg-gray-400"
                  style={{
                    transform: `rotate(${angle}deg)`,
                    transformOrigin: '0 50%',
                    width: `${distance}px`,
                  }}
                />
              </div>
            );
          })}
        </div>
      );
    }

    // If data is an array, create a simple mind map
    if (Array.isArray(data)) {
      const central = data[0];
      const branches = data.slice(1);
      
      return (
        <div className="relative h-80">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
              {typeof central === 'string' ? central : central.title || central.name || 'Central Topic'}
            </div>
          </div>
          {branches.map((branch, index) => {
            const angle = (index * 360) / branches.length;
            const distance = 120;
            const x = Math.cos((angle * Math.PI) / 180) * distance;
            const y = Math.sin((angle * Math.PI) / 180) * distance;
            
            return (
              <div
                key={index}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                }}
              >
                <div className="bg-white border-2 border-gray-300 px-3 py-2 rounded-lg shadow-md text-xs">
                  <p className="font-semibold">
                    {typeof branch === 'string' ? branch : branch.title || branch.name || `Branch ${index + 1}`}
                  </p>
                  {branch.description && (
                    <p className="text-gray-600 mt-1">{branch.description}</p>
                  )}
                </div>
                <svg
                  className="absolute top-1/2 left-1/2 w-32 h-0.5 bg-gray-400"
                  style={{
                    transform: `rotate(${angle}deg)`,
                    transformOrigin: '0 50%',
                    width: `${distance}px`,
                  }}
                />
              </div>
            );
          })}
        </div>
      );
    }

    // If data is an object, create a mind map from keys
    if (typeof data === 'object') {
      const entries = Object.entries(data);
      const central = 'Main Concept';
      
      return (
        <div className="relative h-80">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
              {central}
            </div>
          </div>
          {entries.map(([key, value], index) => {
            const angle = (index * 360) / entries.length;
            const distance = 120;
            const x = Math.cos((angle * Math.PI) / 180) * distance;
            const y = Math.sin((angle * Math.PI) / 180) * distance;
            
            return (
              <div
                key={index}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                }}
              >
                <div className="bg-white border-2 border-gray-300 px-3 py-2 rounded-lg shadow-md text-xs">
                  <p className="font-semibold">{key}</p>
                  <p className="text-gray-600 mt-1">
                    {typeof value === 'string' ? value.substring(0, 50) + (value.length > 50 ? '...' : '') : JSON.stringify(value)}
                  </p>
                </div>
                <svg
                  className="absolute top-1/2 left-1/2 w-32 h-0.5 bg-gray-400"
                  style={{
                    transform: `rotate(${angle}deg)`,
                    transformOrigin: '0 50%',
                    width: `${distance}px`,
                  }}
                />
              </div>
            );
          })}
        </div>
      );
    }

    // Fallback: render as JSON
    return (
      <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-64">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  };

  return (
    <div className="h-96 border rounded-lg bg-gray-50 overflow-hidden">
      <div className="p-4 border-b bg-white">
        <h3 className="font-semibold text-sm text-gray-700">{title}</h3>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <div className="p-4">
        {renderMindMapContent()}
      </div>
    </div>
  );
}