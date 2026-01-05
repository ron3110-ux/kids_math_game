
import React from 'react';

interface FeedbackBubbleProps {
  type: 'success' | 'error';
  message: string;
}

const FeedbackBubble: React.FC<FeedbackBubbleProps> = ({ type, message }) => {
  const bgColor = type === 'success' ? 'bg-green-100 border-green-400 text-green-700' : 'bg-orange-100 border-orange-400 text-orange-700';
  const icon = type === 'success' ? '🌟' : '💡';

  return (
    <div className={`mt-4 p-4 rounded-xl border-2 ${bgColor} flex items-center gap-3 animate-bounce`}>
      <span className="text-2xl">{icon}</span>
      <p className="font-bold text-lg">{message}</p>
    </div>
  );
};

export default FeedbackBubble;
