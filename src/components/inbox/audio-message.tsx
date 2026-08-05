export function AudioMessage({ messageId }: { messageId: string }) {
  return <audio className="w-full min-w-[220px]" controls src={`/api/messages/${messageId}/media`} preload="none" />;
}
