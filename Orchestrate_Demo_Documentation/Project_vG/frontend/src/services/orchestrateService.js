export const postChatMessage = async (message, threadId) => {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, threadId })
  });

  if (!response.ok) {
    // We get the text (which is our diagnostic JSON) and throw it
    const errorBody = await response.text();
    throw new Error(errorBody);
  }

  return response;
};