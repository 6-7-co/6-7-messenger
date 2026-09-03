import { useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { useStore } from '../store';
import { ImageIcon, SendIcon } from './Icons';

interface MessageInputProps {
  conversationId: string;
}

export function MessageInput({ conversationId }: MessageInputProps) {
  const { sendText, sendImage, setTyping } = useStore();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const typingRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const stopTyping = () => {
    if (typingRef.current) {
      typingRef.current = false;
      setTyping(conversationId, false);
    }
  };

  const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;

    if (value.length > 0 && !typingRef.current) {
      typingRef.current = true;
      setTyping(conversationId, true);
    } else if (value.length === 0 && typingRef.current) {
      stopTyping();
    }
  };

  const send = async () => {
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    try {
      await sendText(conversationId, value);
      setText('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      stopTyping();
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || uploading) return;
    setUploading(true);
    try {
      await sendImage(conversationId, file);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="composer">
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        hidden
        onChange={(e) => void onFile(e)}
      />
      <button
        className="icon-btn"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        title="Attach photo"
      >
        <ImageIcon size={20} />
      </button>
      <textarea
        ref={textareaRef}
        className="composer-input"
        rows={1}
        placeholder="Type a message…"
        value={text}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onBlur={stopTyping}
      />
      <button
        className="send-btn"
        onClick={() => void send()}
        disabled={!text.trim() || sending}
        title="Send"
      >
        <SendIcon size={18} />
      </button>
    </div>
  );
}
