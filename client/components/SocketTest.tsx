import { useEffect, useState, useCallback } from 'react';
import { Box, Text } from '@chakra-ui/react';
import { useSocketIO } from '../hooks/useSocketIO';
import { Appointment } from '../types/appointment';

interface SocketTestProps {
    onAppointmentCreated?: () => void;
    onPendingCountUpdated?: (count: number) => void;
    onTodayAppointmentsUpdated?: (appointments: Appointment[]) => void;
}

export const SocketTest = ({
    onAppointmentCreated,
    onPendingCountUpdated,
    onTodayAppointmentsUpdated
}: SocketTestProps) => {
    const [messages, setMessages] = useState<string[]>([]);
    const { isConnected, on } = useSocketIO('appointments');

    useEffect(() => {
        if (!isConnected) {
            console.log('[SocketTest] Socket not connected, skipping event setup');
            return;
        }

        console.log('[SocketTest] Setting up socket event listeners');

        const cleanup = [
            on<Appointment>('appointment_created', (data) => {
                console.log('[SocketTest] Received appointment_created event:', data);
                setMessages(prev => {
                    console.log('[SocketTest] Previous messages:', prev);
                    const newMessages = [...prev, `[${new Date().toISOString()}] Appointment created: ${JSON.stringify(data)}`];
                    console.log('[SocketTest] New messages:', newMessages);
                    return newMessages;
                });
                if (onAppointmentCreated) {
                    console.log('[SocketTest] Calling onAppointmentCreated callback');
                    try {
                        onAppointmentCreated();
                        console.log('[SocketTest] Successfully executed onAppointmentCreated callback');
                    } catch (error) {
                        console.error('[SocketTest] Error executing onAppointmentCreated callback:', error);
                    }
                }
            }),

            on<{ count: number }>('pending_count_updated', (data) => {
                console.log('[SocketTest] Received pending_count_updated event:', data);
                setMessages(prev => {
                    console.log('[SocketTest] Previous messages:', prev);
                    const newMessages = [...prev, `[${new Date().toISOString()}] Pending count updated: ${JSON.stringify(data)}`];
                    console.log('[SocketTest] New messages:', newMessages);
                    return newMessages;
                });
                if (onPendingCountUpdated) {
                    console.log('[SocketTest] Calling onPendingCountUpdated callback with count:', data.count);
                    try {
                        onPendingCountUpdated(data.count);
                        console.log('[SocketTest] Successfully executed onPendingCountUpdated callback');
                    } catch (error) {
                        console.error('[SocketTest] Error executing onPendingCountUpdated callback:', error);
                    }
                }
            }),

            on<Appointment[]>('today_appointments_updated', (data) => {
                console.log('[SocketTest] Received today_appointments_updated event:', data);
                setMessages(prev => {
                    console.log('[SocketTest] Previous messages:', prev);
                    const newMessages = [...prev, `[${new Date().toISOString()}] Today's appointments updated: ${JSON.stringify(data)}`];
                    console.log('[SocketTest] New messages:', newMessages);
                    return newMessages;
                });
                if (onTodayAppointmentsUpdated) {
                    console.log('[SocketTest] Calling onTodayAppointmentsUpdated callback with appointments:', data);
                    try {
                        onTodayAppointmentsUpdated(data);
                        console.log('[SocketTest] Successfully executed onTodayAppointmentsUpdated callback');
                    } catch (error) {
                        console.error('[SocketTest] Error executing onTodayAppointmentsUpdated callback:', error);
                    }
                }
            })
        ];

        return () => {
            console.log('[SocketTest] Cleaning up socket event listeners');
            cleanup.forEach(unsubscribe => unsubscribe());
        };
    }, [isConnected, on, onAppointmentCreated, onPendingCountUpdated, onTodayAppointmentsUpdated]);

    return (
        <div className="socket-test">
            <Box p={4} border="1px solid" borderColor="gray.200" borderRadius="md" m={4}>
                <Text fontWeight="bold" mb={2}>Socket.IO Test</Text>
                <Text color={isConnected ? "green.500" : "red.500"} mb={4}>
                    Status: {isConnected ? "Connected" : "Disconnected"}
                </Text>
                <Box maxH="200px" overflowY="auto">
                    {messages.map((msg, i) => (
                        <Text key={i} fontSize="sm" mb={1}>{msg}</Text>
                    ))}
                </Box>
            </Box>
        </div>
    );
}; 