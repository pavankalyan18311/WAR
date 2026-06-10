'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { cn, formatPrice } from '@/lib/utils';
import type { ChatMessage, Product } from '@/types';
import { MOCK_PRODUCTS } from '@/lib/mockData';

const QUICK_REPLIES = [
  'Show me oversized t-shirts',
  'Best sellers under ₹1000',
  'What sizes do you have?',
  'Track my order',
];

function generateBotResponse(userMessage: string): { content: string; products?: Product[] } {
  const lower = userMessage.toLowerCase();

  if (lower.includes('oversized') || lower.includes('baggy')) {
    const products = MOCK_PRODUCTS.filter((p) => p.fit_type === 'oversized').slice(0, 3);
    return {
      content: "Here are some great oversized t-shirts for you! 🙌 Each one is crafted from premium cotton for maximum comfort.",
      products,
    };
  }
  if (lower.includes('under ₹1000') || lower.includes('budget') || lower.includes('cheap')) {
    const products = MOCK_PRODUCTS.filter((p) => (p.discount_price ?? p.price) < 1000).slice(0, 3);
    return {
      content: "Great picks under ₹1000! All premium quality, big on style. 🔥",
      products,
    };
  }
  if (lower.includes('size') || lower.includes('fit')) {
    return {
      content: "We have sizes XS, S, M, L, XL, XXL, and 3XL. For an accurate recommendation, try our AI Size Recommender — just enter your measurements and we'll suggest the perfect fit!",
    };
  }
  if (lower.includes('track') || lower.includes('order') || lower.includes('delivery')) {
    return {
      content: "To track your order, please go to My Account → Orders. If you need further help, please share your order number and I'll look it up for you.",
    };
  }
  if (lower.includes('return') || lower.includes('refund')) {
    return {
      content: "We offer hassle-free 7-day returns. No questions asked. Just raise a return request from your account and we'll arrange a pickup within 24 hours. Refunds are processed in 3-5 business days.",
    };
  }
  if (lower.includes('premium') || lower.includes('best quality')) {
    const products = MOCK_PRODUCTS.filter((p) => p.category_id === 5).slice(0, 3);
    return {
      content: "Here are our finest premium collection pieces made with Pima cotton — the gold standard of cotton fabrics. ✨",
      products,
    };
  }
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return {
      content: "Hey there! 👋 I'm your ThreadX AI shopping assistant. I can help you find the perfect t-shirt, check your order, or answer any questions. What are you looking for today?",
    };
  }

  return {
    content: "I'd be happy to help! You can ask me about our products, sizes, orders, returns, or anything else. What would you like to know? 😊",
  };
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      role: 'assistant',
      content: "Hi there! 👋 I'm your ThreadX AI Shopping Assistant. How can I help you today?",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    await new Promise((r) => setTimeout(r, 800 + Math.random() * 500));

    const { content, products } = generateBotResponse(text);
    const botMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content,
      products,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, botMsg]);
    setIsTyping(false);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300',
          isOpen ? 'bg-gray-800 rotate-90' : 'bg-black hover:bg-gray-800'
        )}
        aria-label="Chat with AI assistant"
      >
        {isOpen ? <X size={22} className="text-white" /> : <MessageCircle size={24} className="text-white" />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-[350px] sm:w-[380px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
          style={{ maxHeight: '560px', height: '560px' }}
        >
          {/* Header */}
          <div className="bg-black text-white px-4 py-3.5 flex items-center gap-3">
            <div className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center">
              <Bot size={18} />
            </div>
            <div>
              <p className="font-semibold text-sm">THREADX ASSISTANT</p>
              <p className="text-[11px] text-gray-400">AI Shopping Assistant</p>
            </div>
            <div className="ml-auto w-2 h-2 bg-green-400 rounded-full" title="Online" />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn('flex gap-2', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
              >
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                    msg.role === 'user' ? 'bg-black' : 'bg-gray-100'
                  )}
                >
                  {msg.role === 'user' ? (
                    <User size={14} className="text-white" />
                  ) : (
                    <Bot size={14} className="text-gray-700" />
                  )}
                </div>
                <div className={cn('flex-1 max-w-[80%]', msg.role === 'user' ? 'items-end' : 'items-start', 'flex flex-col')}>
                  <div
                    className={cn(
                      'px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-black text-white rounded-tr-sm'
                        : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                    )}
                  >
                    {msg.content}
                  </div>

                  {/* Product Cards */}
                  {msg.products && msg.products.length > 0 && (
                    <div className="mt-2 space-y-2 w-full">
                      {msg.products.map((product) => (
                        <div key={product.product_id} className="bg-white border border-gray-100 rounded-xl p-2.5 flex gap-2.5 shadow-sm">
                          <div className="relative w-12 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-50">
                            <Image
                              src={product.images[0]?.url || ''}
                              alt={product.name}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-900 line-clamp-2 leading-tight">{product.name}</p>
                            <p className="text-xs font-bold text-gray-900 mt-1">
                              {formatPrice(product.discount_price ?? product.price)}
                            </p>
                            <Link
                              href={`/products/${product.slug}`}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-black bg-gray-100 px-2 py-1 rounded-full mt-1 hover:bg-gray-200 transition-colors"
                            >
                              View <ShoppingBag size={10} />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Bot size={14} className="text-gray-700" />
                </div>
                <div className="bg-gray-100 px-3.5 py-3 rounded-2xl rounded-tl-sm">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick replies */}
          {messages.length <= 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {QUICK_REPLIES.map((reply) => (
                <button
                  key={reply}
                  onClick={() => sendMessage(reply)}
                  className="text-[11px] bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full hover:bg-gray-200 transition-colors"
                >
                  {reply}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-gray-100 px-3 py-3">
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
              className="flex items-center gap-2 bg-gray-50 rounded-full px-4 py-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-transparent text-sm outline-none text-gray-800 placeholder-gray-400"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="text-black hover:text-gray-600 disabled:text-gray-300 transition-colors"
                aria-label="Send"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
