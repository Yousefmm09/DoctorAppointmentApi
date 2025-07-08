import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FiSend, FiSmile, FiPaperclip } from 'react-icons/fi';

const ChatInput = ({ onSendMessage, disabled = false }) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef(null);
  const emojiPickerRef = useRef(null);

  // Auto-focus the textarea when the component mounts
  useEffect(() => {
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  // Handle clicks outside the emoji picker
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showEmojiPicker && emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // Adjust textarea height as content grows
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    // Set new height based on scrollHeight (with a max height)
    const newHeight = Math.min(textarea.scrollHeight, 120);
    textarea.style.height = `${newHeight}px`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim() || disabled || isSending) return;
    
    try {
      setIsSending(true);
      await onSendMessage(message.trim());
      setMessage('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleEmojiClick = (emoji) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const commonEmojis = ['😊', '👍', '❤️', '😃', '👏', '🙏', '🤔', '😷'];

  return (
    <div className="relative">
      {/* Simple emoji picker */}
      {showEmojiPicker && (
        <div 
          ref={emojiPickerRef}
          className="absolute bottom-16 left-2 bg-white rounded-lg shadow-xl border border-slate-200 p-2 z-10"
        >
          <div className="grid grid-cols-4 gap-2">
            {commonEmojis.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                className="text-2xl p-2 hover:bg-slate-100 rounded transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end">
        {/* Emoji button */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          disabled={disabled}
          className={`p-2 rounded-full mr-2 ${
            disabled 
              ? 'text-slate-400 cursor-not-allowed' 
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
          } transition-colors`}
        >
          <FiSmile className="h-5 w-5" />
        </button>

        {/* Attachment button (visual only) */}
        <button
          type="button"
          disabled={disabled}
          className={`p-2 rounded-full mr-2 ${
            disabled 
              ? 'text-slate-400 cursor-not-allowed' 
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
          } transition-colors`}
        >
          <FiPaperclip className="h-5 w-5" />
        </button>

        <div className="relative flex-grow">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              adjustTextareaHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "Connecting..." : "Type your message..."}
            className={`w-full rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 pl-4 pr-12 py-3 resize-none transition-all ${disabled ? 'bg-slate-100 text-slate-500' : ''}`}
            style={{ minHeight: '44px', maxHeight: '120px' }}
            disabled={disabled}
          />
          {isSending && (
            <div className="absolute right-12 bottom-3">
              <div className="h-4 w-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
            </div>
          )}
        </div>
        
        <button
          type="submit"
          disabled={!message.trim() || isSending || disabled}
          className={`ml-2 p-3 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
            !message.trim() || isSending || disabled
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          } transition-colors flex-shrink-0 shadow-sm`}
          aria-label="Send message"
        >
          <FiSend className="h-5 w-5" />
        </button>
      </form>
      
      {/* Connection status */}
      {disabled && (
        <div className="mt-2 text-center">
          <span className="inline-flex items-center text-xs text-slate-500">
            <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-1 animate-pulse"></span>
            Connecting to chat service...
          </span>
        </div>
      )}
    </div>
  );
};

ChatInput.propTypes = {
  onSendMessage: PropTypes.func.isRequired,
  disabled: PropTypes.bool
};

export default ChatInput; 