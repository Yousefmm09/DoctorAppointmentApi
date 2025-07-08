import { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import PropTypes from 'prop-types';

const ChatMessageForm = ({ onMessageSent, disabled }) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef(null);

  // Auto-focus the textarea when the component mounts
  useEffect(() => {
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  // Adjust textarea height as content grows
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    // Set new height based on scrollHeight (with a max height)
    const newHeight = Math.min(textarea.scrollHeight, 150);
    textarea.style.height = `${newHeight}px`;
  };

  const handleMessageChange = (e) => {
    setMessage(e.target.value);
    adjustTextareaHeight();
  };

  const handleKeyDown = (e) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey && !disabled) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim() || disabled) return;
    if (isSending) return;
    
    try {
      setIsSending(true);
      
      // Pass message to parent component for processing
      if (onMessageSent) {
        await onMessageSent(message.trim());
      }
      
      // Clear the input field
      setMessage('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      
      // Re-focus the textarea
      textareaRef.current?.focus();
      
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white p-3">
      <form onSubmit={handleSubmit} className="flex items-end">
        <div className="relative flex-grow">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleMessageChange}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "Connecting to chat service..." : "Type your message..."}
            rows="1"
            className={`w-full rounded-full border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 pl-4 pr-12 py-3 resize-none transition-all ${disabled ? 'bg-gray-100 text-gray-500' : ''}`}
            style={{ minHeight: '44px', maxHeight: '150px' }}
            disabled={disabled}
          />
          {isSending && (
            <div className="absolute right-12 bottom-3 animate-pulse">
              <div className="h-4 w-4 rounded-full bg-blue-500 opacity-75"></div>
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={!message.trim() || isSending || disabled}
          className={`ml-2 p-3 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
            !message.trim() || isSending || disabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          } transition-colors flex-shrink-0`}
          aria-label="Send message"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"
            />
          </svg>
        </button>
      </form>
    </div>
  );
};

ChatMessageForm.propTypes = {
  onMessageSent: PropTypes.func.isRequired,
  disabled: PropTypes.bool
};

ChatMessageForm.defaultProps = {
  disabled: false
};

export default ChatMessageForm; 