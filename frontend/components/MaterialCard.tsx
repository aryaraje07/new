
"use client";

interface MaterialProps {
  material: any;
  onView: (material: any) => void;
  onSummarize: (material: any) => void;
}

export default function MaterialCard({
  material,
  onView,
  onSummarize,
}: MaterialProps) {
  return (
    <div className="bg-white shadow-lg rounded-2xl p-6 border">
      <h2 className="text-lg font-semibold">{material.title}</h2>
      <p className="text-gray-500 text-sm mt-1">{material.description}</p>

      <div className="flex gap-3 mt-5">
        <a
          href={material.filePath}
          target="_blank"
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
        >
          Download
        </a>

        <button
          onClick={() => onView(material)}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
        >
          View
        </button>

        <button
          onClick={() => onSummarize(material)}
          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
        >
          Summarize
        </button>
      </div>
    </div>
  );
}
