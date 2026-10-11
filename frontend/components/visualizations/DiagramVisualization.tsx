"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DiagramVisualizationProps {
  data: any;
  title: string;
  description: string;
}

export default function DiagramVisualization({ data, title, description }: DiagramVisualizationProps) {
  const renderDiagramContent = () => {
    if (!data) {
      return <p className="text-center text-gray-500">No diagram data available</p>;
    }

    // If data is an array, render as a process diagram
    if (Array.isArray(data)) {
      return (
        <div className="space-y-4">
          {data.map((item, index) => (
            <div key={index} className="flex items-center space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                  <p className="text-sm font-medium">
                    {typeof item === 'string' ? item : item.title || item.name || item.step || `Step ${index + 1}`}
                  </p>
                  {item.description && (
                    <p className="text-xs text-gray-600 mt-1">{item.description}</p>
                  )}
                </div>
              </div>
              {index < data.length - 1 && (
                <div className="flex-shrink-0">
                  <div className="w-4 h-4 border-l-2 border-b-2 border-gray-400 transform rotate-45"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    // If data is an object, render as a concept map
    if (typeof data === 'object') {
      const entries = Object.entries(data);
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entries.map(([key, value]) => (
            <div key={key} className="bg-white p-4 rounded-lg border shadow-sm">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <h4 className="font-semibold text-sm">{key}</h4>
              </div>
              <p className="text-xs text-gray-600">
                {typeof value === 'string' ? value : JSON.stringify(value)}
              </p>
            </div>
          ))}
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
    <div className="h-96 border rounded-lg bg-gray-50 overflow-auto p-4">
      <div className="mb-4">
        <h3 className="font-semibold text-sm text-gray-700">{title}</h3>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      {renderDiagramContent()}
    </div>
  );
}