import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { FaPaperPlane, FaTimes, FaRobot, FaMinus } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

const ChatBot = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { type: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const response = await axios.post('http://localhost:5109/api/AdvancedChatBot/chat', {
                message: userMessage,
                userId: localStorage.getItem('userId') || 'anonymous'
            });

            const botResponse = response.data.response || response.data;
            setMessages(prev => [...prev, { type: 'bot', content: botResponse }]);
        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => [...prev, {
                type: 'bot',
                content: 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleChat = () => {
        setIsOpen(!isOpen);
        setIsMinimized(false);
    };

    const toggleMinimize = (e) => {
        e.stopPropagation();
        setIsMinimized(!isMinimized);
    };

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ 
                            opacity: 1, 
                            y: 0, 
                            scale: 1,
                            height: isMinimized ? 'auto' : '600px'
                        }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white rounded-2xl shadow-2xl overflow-hidden w-[400px] border border-blue-100"
                        style={{ 
                            boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.1), 0 8px 10px -6px rgba(59, 130, 246, 0.1)'
                        }}
                    >
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                    <FaRobot className="text-xl" />
                                </div>
                                <h2 className="text-xl font-semibold">Medical Assistant</h2>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button 
                                    onClick={toggleMinimize}
                                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <FaMinus />
                                </button>
                                <button 
                                    onClick={toggleChat}
                                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <FaTimes />
                                </button>
                            </div>
                        </div>
                        
                        {!isMinimized && (
                            <>
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 h-[460px] bg-gradient-to-b from-blue-50/50 to-white">
                                    {messages.length === 0 && (
                                        <div className="text-center text-gray-500 mt-8">
                                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                                                <FaRobot className="text-2xl text-blue-600" />
                                            </div>
                                            <p className="text-sm">مرحباً! كيف يمكنني مساعدتك اليوم؟</p>
                                        </div>
                                    )}
                                    {messages.map((message, index) => (
                                        <div
                                            key={index}
                                            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className={`max-w-[80%] p-3 rounded-2xl shadow-sm ${
                                                    message.type === 'user'
                                                        ? 'bg-blue-600 text-white rounded-br-none'
                                                        : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'
                                                }`}
                                            >
                                                <ReactMarkdown className="prose max-w-none text-inherit">
                                                    {message.content}
                                                </ReactMarkdown>
                                            </motion.div>
                                        </div>
                                    ))}
                                    {isLoading && (
                                        <div className="flex justify-start">
                                            <motion.div 
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="bg-white border border-gray-100 p-4 rounded-2xl rounded-bl-none shadow-sm"
                                            >
                                                <div className="flex space-x-2">
                                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100"></div>
                                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200"></div>
                                                </div>
                                            </motion.div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>
                                
                                <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-gray-100">
                                    <div className="flex space-x-2">
                                        <input
                                            type="text"
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder="اكتب رسالتك هنا..."
                                            className="flex-1 p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                                            disabled={isLoading}
                                            dir="rtl"
                                        />
                                        <button
                                            type="submit"
                                            disabled={isLoading || !input.trim()}
                                            className={`p-3 rounded-xl transition-all ${
                                                isLoading || !input.trim()
                                                    ? 'bg-gray-100 text-gray-400'
                                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                            }`}
                                        >
                                            <FaPaperPlane className="transform rotate-[45deg]" />
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {!isOpen && (
                <motion.button
                    onClick={toggleChat}
                    className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <FaRobot className="text-2xl" />
                </motion.button>
            )}
        </div>
    );
};

export default ChatBot; 