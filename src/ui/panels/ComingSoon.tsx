export function ComingSoon({ phase }: { phase?: number }) {
  return (
    <p className="rounded-button bg-felt-800 px-4 py-3 text-sm text-bone">
      {phase ? `This tool arrives in Phase ${phase}.` : 'This tool is not built yet.'}
    </p>
  );
}
