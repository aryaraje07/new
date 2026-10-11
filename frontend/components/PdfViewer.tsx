interface Props {
  fileUrl: string;
}

export default function PdfViewer({ fileUrl }: Props) {
  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-3">Document Preview</h2>

      <iframe
        src={fileUrl}
        width="100%"
        height="600px"
        className="rounded-xl border shadow"
      />
    </div>
  );
}
