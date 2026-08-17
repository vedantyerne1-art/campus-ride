import React, { useState, useEffect, useRef } from "react";
import { Send, X, Shield, Lock, MessageSquare } from "lucide-react";
import { ChatMessage } from "../types";
import { sendChatMessage, subscribeTripMessages } from "../services/tripService";

interface ChatDrawerProps {
  tripId: string;
  currentUser: { uid: string; displayName: string; role: "rider" | "driver" };
  otherPartyName: string;
  otherPartyRole: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  tripId,
  currentUser,
  otherPartyName,
  otherPartyRole,
  isOpen,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tripId || !isOpen) return;
    const unsub = subscribeTripMessages(tripId, (msgs) => {
      setMessages(msgs);
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    });

    return () => unsub();
  }, [tripId, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;

    setIsSending(true);
    try {
      await sendChatMessage(
        tripId,
        {
          id: currentUser.uid,
          name: currentUser.displayName,
          role: currentUser.role,
        },
        inputText
      );
      setInputText("");
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-2xl">
      <div className="w-full max-w-lg rounded-[28px] liquid-glass-panel shadow-2xl flex flex-col h-[520px] overflow-hidden specular-shine">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 font-bold">
              {otherPartyName.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">{otherPartyName}</h3>
              <div className="flex items-center gap-1.5 text-[11px] text-indigo-300">
                <Lock className="w-3 h-3 text-emerald-400" />
                <span>Masked & Encrypted In-App Chat</span>
              </div>
            </div>
          </div>
          <button
            id="btn-close-chat"
            onClick={onClose}
            className="p-2 rounded-[12px] liquid-glass-btn text-white/60 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Security Notice */}
        <div className="px-4 py-2 bg-indigo-950/40 border-b border-indigo-500/20 flex items-center gap-2 text-[11px] text-indigo-200">
          <Shield className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>Phone numbers are private. Always communicate via this in-app channel.</span>
        </div>

        {/* Messages Body */}
        <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-white/50">
              <MessageSquare className="w-8 h-8 text-indigo-400 mb-2 opacity-60" />
              <p className="text-xs">No messages yet. Send a message to coordinate pickup.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderId === currentUser.uid;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[78%] px-4 py-2.5 rounded-[18px] text-xs ${
                      isMine
                        ? "liquid-glass-primary text-white rounded-br-none"
                        : "liquid-glass-subtle text-white rounded-bl-none"
                    }`}
                  >
                    <p>{msg.text}</p>
                  </div>
                  <span className="text-[10px] text-white/40 mt-1 px-1 font-mono">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Message Input */}
        <form onSubmit={handleSend} className="p-3.5 border-t border-white/10 bg-slate-900/40 flex items-center gap-2">
          <input
            id="input-chat-message"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message (e.g. 'I am near Gate 1')..."
            className="flex-1 px-4 py-2.5 rounded-[14px] liquid-glass-input text-xs text-white placeholder-white/40 focus:outline-none"
          />
          <button
            id="btn-send-message"
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="p-3 rounded-[14px] liquid-glass-primary disabled:opacity-40 text-white shadow-lg cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
