import { ServiceRequest, Comment, Label, WorkflowStatus } from './core';
import { ApiServiceRequest, ApiComment, ApiLabel } from './api';

/**
 * Safely converts a string to a number, returning undefined if invalid
 */
const safeParseInt = (value: string | undefined): number | undefined => {
    if (!value) return undefined;
    const num = parseInt(value, 10);
    return isNaN(num) ? undefined : num;
};

/**
 * Type guard for Error objects
 */
const isError = (error: unknown): error is Error => {
    return error instanceof Error;
};

/**
 * Gets error message from unknown error
 */
const getErrorMessage = (error: unknown): string => {
    if (isError(error)) return error.message;
    if (typeof error === 'string') return error;
    return 'An unknown error occurred';
};

/**
 * Transforms an API service request to our UI model
 * @throws Error if required fields are missing
 */
export const transformApiToUiRequest = (api: ApiServiceRequest): ServiceRequest => {
    try {
        const id = safeParseInt(api.id);
        if (!id) throw new Error('Invalid ID in API response');

        return {
            id,
            customer: {
                id: parseInt(api.customer.id),
                first_name: api.customer.user.first_name,
                last_name: api.customer.user.last_name,
                email: api.customer.user.email,
                phone: api.customer.phone_number,
                preferred_contact: api.customer.preferred_contact
            },
            vehicle: {
                id: parseInt(api.vehicle.id),
                make: api.vehicle.make,
                model: api.vehicle.model,
                year: api.vehicle.year,
                vin: api.vehicle.vin
            },
            services: api.services.map(s => ({
                id: parseInt(s.id),
                service_type: s.service_type,
                description: s.description,
                urgency: s.urgency,
                price: s.price
            })),
            status: api.status,
            created_at: api.created_at,
            updated_at: api.updated_at,
            workflow_column: api.workflow_column as WorkflowStatus,
            workflow_position: parseInt(api.workflow_position),
            workflow_history: api.workflow_history,
            comments: api.comments.map(transformApiToUiComment),
            labels: api.labels.map(transformApiToUiLabel),
            appointment_date: api.appointment_date,
            appointment_time: api.appointment_time,
            after_hours_dropoff: api.after_hours_dropoff
        };
    } catch (error: unknown) {
        console.error('Error transforming API service request:', error);
        console.error('Problematic API data:', api);
        throw new Error(`Failed to transform service request: ${getErrorMessage(error)}`);
    }
};

/**
 * Transforms an API comment to our UI model
 */
export const transformApiToUiComment = (api: ApiComment): Comment => {
    try {
        return {
            id: parseInt(api.id),
            user: {
                first_name: api.user.first_name,
                last_name: api.user.last_name
            },
            text: api.text,
            created_at: api.created_at
        };
    } catch (error: unknown) {
        console.error('Error transforming API comment:', error);
        throw new Error(`Failed to transform comment: ${getErrorMessage(error)}`);
    }
};

/**
 * Transforms an API label to our UI model
 */
export const transformApiToUiLabel = (api: ApiLabel): Label => {
    try {
        return {
            id: parseInt(api.id),
            name: api.name,
            color: api.color
        };
    } catch (error: unknown) {
        console.error('Error transforming API label:', error);
        throw new Error(`Failed to transform label: ${getErrorMessage(error)}`);
    }
};

/**
 * Transforms UI data back to API format for POST/PUT requests
 */
export const transformUiToApiRequest = (ui: Partial<ServiceRequest>): Partial<ApiServiceRequest> => {
    return {
        ...(ui.id && { id: ui.id.toString() }),
        ...(ui.services && {
            services: ui.services.map(s => ({
                ...s,
                id: s.id.toString()
            }))
        }),
        ...(ui.appointment_date && { appointment_date: ui.appointment_date }),
        ...(ui.appointment_time && { appointment_time: ui.appointment_time }),
        ...(ui.after_hours_dropoff !== undefined && { after_hours_dropoff: ui.after_hours_dropoff })
    };
}; 