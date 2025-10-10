// PERCORSO CONSIGLIATO: src/pages/AlfredChatbot.js o src/components/AlfredChatbot.js

import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageSquare } from 'lucide-react';
import '../styles/AlfredChatbot.css'; // Assicurati che il percorso al CSS sia corretto

// Componente per l'avatar di Alfred (puoi personalizzarlo)
const AlfredAvatar = () => (
    <div className="alfred-avatar">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 8V4H8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 16h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 11h-4m4 2h-4" stroke="white" strokeWidth="1.5"/>
            <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/>
        </svg>
    </div>
 );

// Componente per la singola "bolla" di messaggio
const MessageBubble = ({ message, sender }) => (
    <div className={`message-bubble-wrapper ${sender === 'user' ? 'sent' : 'received'}`}>
        {sender === 'alfred' && <AlfredAvatar />}
        <div className="message-bubble">
            <p>{message}</p>
        </div>
    </div>
);

const AlfredChatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { sender: 'alfred', text: "Ciao! Sono Alfred. Come posso aiutarti a usare l'app oggi?" },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages, isOpen]);

    const sendMessage = async (text) => {
        if (!text.trim() || loading) return;

        const newUserMessage = { sender: 'user', text };
        setMessages(prev => [...prev, newUserMessage]);
        setInput('');
        setLoading(true);

        try {
            // La chiamata al backend che hai già configurato
            const response = await fetch('/api/alfred-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text }),
            });

            if (!response.ok) throw new Error(`Errore dal server: ${response.statusText}`);

            const result = await response.json();
            const generatedText = result.reply || "Mi scuso, ho un problema di connessione. Puoi ripetere?";
            setMessages(prev => [...prev, { sender: 'alfred', text: generatedText }]);
        } catch (error) {
            console.error("Errore chiamata backend:", error);
            setMessages(prev => [...prev, { sender: 'alfred', text: "Ops, qualcosa è andato storto. Riprova tra poco!" }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !loading) {
            sendMessage(input);
        }
    };

    return (
        <div className="alfred-widget-container">
            {/* Finestra della chat */}
            <div className={`chat-window ${isOpen ? 'open' : ''}`}>
                {/* Header */}
                <div className="chat-header">
                    <AlfredAvatar />
                    <div className="header-text">
                        <h3>Alfred Assistente</h3>
                        <p>Online</p>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="close-btn" aria-label="Chiudi chat">
                        <X size={20} />
                    </button>
                </div>

                {/* Corpo Messaggi */}
                <div className="chat-body custom-scrollbar">
                    {messages.map((msg, index) => (
                        <MessageBubble key={index} message={msg.text} sender={msg.sender} />
                    ))}
                    {loading && (
                        <div className="message-bubble-wrapper received">
                             <AlfredAvatar />
                            <div className="message-bubble typing-indicator">
                                <div className="dot"></div><div className="dot"></div><div className="dot"></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Footer con Input */}
                <div className="chat-footer">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Scrivi un messaggio..."
                        disabled={loading}
                    />
                    <button
                        onClick={() => sendMessage(input)}
                        disabled={!input.trim() || loading}
                        className="send-btn"
                        aria-label="Invia messaggio"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>

            {/* Pulsante flottante per aprire/chiudere */}
            <button onClick={() => setIsOpen(!isOpen)} className="alfred-fab" aria-label="Apri chat">
                {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
            </button>
        </div>
    );
};

export default AlfredChatbot;
