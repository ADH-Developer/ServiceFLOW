/**
 * Core business entities and shared types for the ServiceFLOW application.
 * These types represent the canonical form of our data within the UI layer.
 */

/**
 * Represents a customer in the system
 * @property id - Unique identifier for the customer
 * @property first_name - Customer's first name
 * @property last_name - Customer's last name
 * @property email - Customer's email address
 * @property phone - Customer's phone number
 * @property preferred_contact - Customer's preferred contact method
 */
export interface Customer {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    preferred_contact: 'email' | 'phone';
}

/**
 * Represents a vehicle in the system
 * @property id - Unique identifier for the vehicle
 * @property make - Vehicle manufacturer
 * @property model - Vehicle model
 * @property year - Vehicle year
 * @property vin - Vehicle identification number
 */
export interface Vehicle {
    id: number;
    make: string;
    model: string;
    year: string;
    vin: string;
}

/**
 * Represents a service to be performed
 * @property id - Unique identifier for the service
 * @property service_type - Type of service to be performed
 * @property description - Detailed description of the service
 * @property urgency - Priority level of the service
 * @property price - Optional price for the service
 */
export interface Service {
    id: number;
    service_type: string;
    description: string;
    urgency: 'low' | 'medium' | 'high';
    price?: number;
}

/**
 * Valid workflow status values for service requests
 */
export type WorkflowStatus = 'estimates' | 'in_progress' | 'waiting_parts' | 'completed';

/**
 * Represents the state of the workflow board
 * @property [key: string] - Column ID containing an array of service requests
 */
export interface WorkflowState {
    [key: string]: ServiceRequest[];
}

/**
 * Represents a service request in the system
 * This is the core business entity that tracks a customer's service needs
 * @property id - Unique identifier for the service request
 * @property customer - Associated customer information
 * @property vehicle - Vehicle requiring service
 * @property services - Array of services to be performed
 * @property status - Current status of the request
 * @property workflow_column - Current column in the workflow board
 * @property workflow_position - Position within the workflow column
 * @property workflow_history - History of workflow state changes
 * @property comments - Comments associated with the request
 * @property labels - Labels attached to the request
 * @property appointment_date - Scheduled appointment date
 * @property appointment_time - Scheduled appointment time
 * @property after_hours_dropoff - Whether vehicle will be dropped off after hours
 */
export interface ServiceRequest {
    id: number;
    customer: Customer;
    vehicle: Vehicle;
    services: Service[];
    status: string;
    created_at: string;
    updated_at: string;
    workflow_column: WorkflowStatus;
    workflow_position: number;
    workflow_history: WorkflowHistory[];
    comments: Comment[];
    labels: Label[];
    appointment_date: string;
    appointment_time: string;
    after_hours_dropoff?: boolean;
}

/**
 * Represents a simplified view of an appointment for list displays
 */
export interface AppointmentListItem {
    id: number;
    appointment_date: string;
    appointment_time: string;
    customer: Pick<Customer, 'first_name' | 'last_name'>;
    vehicle: Pick<Vehicle, 'year' | 'make' | 'model'>;
    services: Array<Pick<Service, 'service_type' | 'urgency'>>;
}

/**
 * Represents a change in workflow state
 */
export interface WorkflowHistory {
    user: string;
    timestamp: string;
    from_column: string;
    to_column: string;
}

/**
 * Represents a comment on a service request
 */
export interface Comment {
    id: number;
    user: {
        first_name: string;
        last_name: string;
    };
    text: string;
    created_at: string;
}

/**
 * Represents a label that can be attached to service requests
 */
export interface Label {
    id: number;
    name: string;
    color?: string;
}

/**
 * WebSocket message types for workflow updates
 */
export interface WorkflowUpdateMessage {
    type: 'workflow_update';
    data: {
        columns: {
            [key: string]: ServiceRequest[];
        };
        column_order?: string[];
    };
}

export interface CardMovedMessage {
    type: 'card_moved';
    success: boolean;
    card_id: number;
    new_column: string;
    position: number;
}

export type WebSocketMessage =
    | WorkflowUpdateMessage
    | CardMovedMessage
    | { type: 'pong' }; 