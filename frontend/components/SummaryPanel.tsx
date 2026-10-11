interface Props {
  summary: string;
}

export default function SummaryPanel({ summary }: Props) {
  return (
    <div className="mt-8 bg-gray-100 p-6 rounded-2xl shadow">
      <h2 className="text-xl font-bold mb-4">AI Summary</h2>

      <div className="whitespace-pre-line text-gray-700">
        {summary}
      </div>
    </div>
  );
}
