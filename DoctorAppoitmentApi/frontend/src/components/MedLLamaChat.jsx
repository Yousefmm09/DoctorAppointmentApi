import React, { useState, useEffect, useRef } from 'react';
import { FaPaperPlane, FaSpinner } from 'react-icons/fa';
import axios from 'axios';

const MedLLamaChat = ({ userId = null }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  
  const messagesEndRef = useRef(null);

  // Scroll to the bottom of the chat when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add an initial welcome message
  useEffect(() => {
    setMessages([
      {
        text: 'مرحباً، أنا المساعد الطبي الذكي. كيف يمكنني مساعدتك اليوم؟',
        isBot: true,
        timestamp: new Date().toISOString()
      }
    ]);
  }, []);

  const handleSendMessage = async (text = input) => {
    if (!text.trim()) return;
    
    // Add user message to chat
    const userMessage = {
      text,
      isBot: false,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);
    
    try {
      // Make API call to backend
      const response = await axios.post('/api/MedLLama/chat', {
        message: text,
        userId,
        includeSuggestions: true
      });
      
      // Process the response
      const botMessage = {
        text: response.data.response || 'عذراً، حدث خطأ في معالجة طلبك.',
        isBot: true,
        timestamp: new Date().toISOString(),
        source: response.data.source || 'unknown'
      };
      
      setMessages(prev => [...prev, botMessage]);
      
      // Set suggested questions if available
      if (response.data.suggestions && response.data.suggestions.length > 0) {
        setSuggestedQuestions(response.data.suggestions);
      } else {
        setSuggestedQuestions([]);
      }
      
    } catch (err) {
      console.error('Error sending message:', err);
      setError('حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.');
      
      // Add error message to chat
      const errorMessage = {
        text: 'عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.',
        isBot: true,
        isError: true,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleSuggestedQuestionClick = (question) => {
    handleSendMessage(question);
    setSuggestedQuestions([]); // Clear suggested questions after selecting one
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-lg shadow-md overflow-hidden">
      {/* Chat Header */}
      <div className="px-4 py-3 bg-blue-600 text-white">
        <h2 className="text-xl font-bold text-right">المساعد الطبي الذكي</h2>
        <p className="text-sm opacity-75 text-right">استشر المساعد الطبي في مشاكلك الصحية</p>
      </div>
      
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ direction: 'rtl' }}>
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
          >
            <div 
              className={`max-w-3/4 p-3 rounded-lg ${
                message.isBot 
                  ? message.isError 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-blue-100 text-blue-800' 
                  : 'bg-green-100 text-green-800'
              }`}
            >
              <p className="text-right whitespace-pre-wrap">{message.text}</p>
              {message.source === 'medllama' && (
                <span className="text-xs opacity-50 block text-left mt-1">
                  MedLLama 🤖
                </span>
              )}
            </div>
          </div>
        ))}
        
        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 p-3 rounded-lg flex items-center">
              <FaSpinner className="animate-spin text-blue-600 ml-2" />
              <span>جاري التفكير...</span>
            </div>
          </div>
        )}
        
        {/* Error message if not part of messages */}
        {error && !messages.some(m => m.isError) && (
          <div className="flex justify-start">
            <div className="bg-red-100 p-3 rounded-lg text-red-800">
              <p>{error}</p>
            </div>
          </div>
        )}
        
        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Suggested Questions */}
      {suggestedQuestions.length > 0 && (
        <div className="px-4 py-2 bg-gray-100 flex flex-wrap justify-end gap-2">
          {suggestedQuestions.map((question, index) => (
            <button
              key={index}
              onClick={() => handleSuggestedQuestionClick(question)}
              className="bg-white text-blue-600 px-3 py-1 rounded-full text-sm border border-blue-300 hover:bg-blue-50"
            >
              {question}
            </button>
          ))}
        </div>
      )}
      
      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="flex items-center">
          <button
            onClick={() => handleSendMessage()}
            disabled={loading || !input.trim()}
            className={`p-2 rounded-full ml-2 ${
              loading || !input.trim() ? 'bg-gray-300 text-gray-500' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {loading ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="اكتب رسالتك هنا..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows="2"
            dir="rtl"
            disabled={loading}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2 text-right">
          اضغط Enter للإرسال أو Shift+Enter لإضافة سطر جديد
        </p>
      </div>
    </div>
  );
};

export default MedLLamaChat;
