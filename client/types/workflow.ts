import { ServiceRequest } from './serviceRequest';

export interface BoardState {
    [key: string]: ServiceRequest[];
}

export interface WorkflowHistory {
    user: string;
    timestamp: string;
    from_column: string;
    to_column: string;
}

export interface Comment {
    id: number;
    user: {
        first_name: string;
        last_name: string;
    };
    text: string;
    created_at: string;
}

export interface Label {
    id: number;
    name: string;
} 