import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Outlet, useOutletContext } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LiveSessionPage from './pages/LiveSessionPage';
import SettingsModal from './components/SettingsModal';

type ContextType = {
  openSettings: () => void;
  interval: number;
  setInterval: (value: number) => void;
};

const Layout: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [interval, setInterval] = useState(3.5);

  return (
    <>
      <Outlet context={{
        openSettings: () => setIsSettingsOpen(true),
        interval,
        setInterval
      } satisfies ContextType} />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        interval={interval}
        onIntervalChange={setInterval}
      />
    </>
  );
};

export const useSettings = () => {
  return useOutletContext<ContextType>();
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/live" element={<LiveSessionPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
