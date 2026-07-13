import React, { createContext, useContext, ReactNode } from 'react';
import toast, { Toaster } from 'react-hot-toast';

interface NotificationContextType {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showLoading: (message: string) => string;
  dismissToast: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const showSuccess = (message: string) => {
    toast.success(message);
  };

  const showError = (message: string) => {
    toast.error(message);
  };

  const showLoading = (message: string): string => {
    return toast.loading(message);
  };

  const dismissToast = (id: string) => {
    toast.dismiss(id);
  };

  return (
    <NotificationContext.Provider value={{
      showSuccess,
      showError,
      showLoading,
      dismissToast
    }}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          loading: { duration: 8000 },
          style: {
            background: '#fff',
            color: '#0f172a',
            padding: window.innerWidth < 640 ? '8px 10px' : '16px',
            borderRadius: '10px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            fontSize: window.innerWidth < 640 ? '11px' : '14px',
            maxWidth: window.innerWidth < 640 ? '220px' : '356px',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
          },
        }}
      />
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
