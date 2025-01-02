declare module '*.css' {
    const content: { [className: string]: string };
    export default content;
}

declare module '*.svg' {
    import { FC, SVGProps } from 'react';
    const content: FC<SVGProps<SVGElement>>;
    export default content;
}

interface Window {
    ENV: {
        API_URL: string;
        WS_URL: string;
    };
}

type WorkflowCard = {
    id: number;
    title: string;
    description: string;
    status: string;
    position: number;
    created_at: string;
    updated_at: string;
};

type WorkflowColumn = {
    id: string;
    title: string;
    cards: WorkflowCard[];
};

type Workflow = {
    id: number;
    title: string;
    description: string;
    columns: WorkflowColumn[];
    created_at: string;
    updated_at: string;
}; 