import { useStore } from './store';
import { AuthScreen } from './components/AuthScreen';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { LogoIcon } from './components/Icons';

export default function App() {
  const { status } = useStore();

  if (status === 'booting') {
    return (
      <div className="splash">
        <LogoIcon size={44} />
        <div className="spinner" />
      </div>
    );
  }

  if (status === 'guest') {
    return <AuthScreen />;
  }

  return (
    <div className="app">
      <Sidebar />
      <ChatWindow />
    </div>
  );
}
