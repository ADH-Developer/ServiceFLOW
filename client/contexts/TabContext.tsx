import React, { createContext, useContext, useState } from 'react';

type TabContextType = {
    activeTab: string;
    setActiveTab: (tab: string) => void;
};

const TabContext = createContext<TabContextType | undefined>(undefined);

export const TabProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activeTab, setActiveTab] = useState('service-advisor');

    return (
        <TabContext.Provider value={{ activeTab, setActiveTab }}>
            {children}
        </TabContext.Provider>
    );
};

export const useTab = () => {
    const context = useContext(TabContext);
    if (context === undefined) {
        throw new Error('useTab must be used within a TabProvider');
    }
    return context;
}; 