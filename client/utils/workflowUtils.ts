import { BoardState } from '../types/workflow';

export const transformBoardData = (data: any): BoardState => {
    if (!data || !data.columns || typeof data.columns !== 'object') {
        return {};
    }

    const transformedColumns: BoardState = {};

    Object.entries(data.columns).forEach(([columnId, cards]) => {
        if (Array.isArray(cards)) {
            transformedColumns[columnId] = cards.map(card => ({
                ...card,
                // Ensure workflow_history is properly formatted
                workflow_history: Array.isArray(card.workflow_history)
                    ? card.workflow_history.map((entry: any) => ({
                        ...entry,
                        user: typeof entry.user === 'string' ? entry.user : entry.user?.name || ''
                    }))
                    : [],
                // Ensure comments are properly formatted
                comments: Array.isArray(card.comments)
                    ? card.comments.map((comment: any) => {
                        // If user is a string (e.g. "John Doe"), split it into first and last name
                        let userObj;
                        if (typeof comment.user === 'string') {
                            const [first_name = '', last_name = ''] = comment.user.split(' ');
                            userObj = { first_name, last_name };
                        } else {
                            userObj = comment.user || { first_name: '', last_name: '' };
                        }

                        return {
                            ...comment,
                            user: userObj
                        };
                    })
                    : [],
                // Ensure labels are properly formatted
                labels: Array.isArray(card.labels)
                    ? card.labels.map((label: any) => typeof label === 'object' ? label.name : label)
                    : []
            }));
        }
    });

    return transformedColumns;
}; 