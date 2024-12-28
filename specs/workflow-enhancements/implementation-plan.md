# Workflow Board Enhancements - Implementation Plan

## Overview
This plan outlines the improvements to the workflow board focusing on drag & drop functionality and card design. The goal is to enhance usability while maintaining MVP scope.

## 1. Enhanced Drag & Drop

### Phase 1: Basic DnD Improvements
- [ ] Add @dnd-kit/sortable dependency
- [ ] Refactor WorkflowBoard to use SortableContext
- [ ] Update WorkflowCard to use useSortable hook
- [ ] Make entire card draggable by removing grip handle
- [ ] Add basic drag overlay with card content

### Phase 2: Visual Feedback
- [ ] Implement ghost card during drag
- [ ] Add drop zone highlighting
- [ ] Add smooth animations for card movement
- [ ] Improve drag start/end transitions

### Phase 3: Sorting Support
- [ ] Add vertical sorting within columns
- [ ] Implement position tracking in backend
- [ ] Update card position on sort
- [ ] Add visual indicators for sort positions

## 2. Card Design Improvements

### Phase 1: Core Design Updates
- [ ] Redesign card layout for better information hierarchy
- [ ] Add status indicator strip/badge
- [ ] Improve typography and spacing
- [ ] Enhance label/tag visualization

### Phase 2: Service Progress
- [ ] Add service completion indicators
- [ ] Show service count and progress
- [ ] Add urgency level visualization
- [ ] Improve date/time formatting

### Phase 3: Visual Polish
- [ ] Add hover states and interactions
- [ ] Implement smooth transitions
- [ ] Add loading states
- [ ] Improve error states

## Technical Implementation Details

### DnD Kit Integration
```typescript
// Example structure for enhanced drag & drop
import { 
    SortableContext, 
    verticalListSortingStrategy 
} from '@dnd-kit/sortable';

const WorkflowColumn = () => {
    return (
        <SortableContext
            items={cards}
            strategy={verticalListSortingStrategy}
        >
            {cards.map(card => (
                <SortableCard key={card.id} card={card} />
            ))}
        </SortableContext>
    );
};
```

### Card Component Structure
```typescript
// Example structure for enhanced card design
interface CardProps {
    serviceRequest: ServiceRequest;
    status: string;
    progress: number;
}

const WorkflowCard = ({ serviceRequest, status, progress }) => {
    return (
        <Box
            borderLeft="4px solid"
            borderLeftColor={getStatusColor(status)}
        >
            <VStack>
                <HStack justify="space-between">
                    <CustomerInfo />
                    <StatusBadge />
                </HStack>
                <ServiceProgress value={progress} />
                <TagsContainer />
            </VStack>
        </Box>
    );
};
```

## Timeline

### Week 1
- Set up enhanced DnD infrastructure
- Implement basic card dragging
- Update card layout and design

### Week 2
- Add sorting functionality
- Implement visual feedback
- Add service progress indicators

### Week 3
- Polish animations and transitions
- Bug fixes and performance optimization
- Testing and documentation

## Success Criteria
1. Cards can be dragged by clicking anywhere on the card
2. Visual feedback clearly shows drag state and drop targets
3. Cards maintain proper order after sorting
4. Service status and progress are clearly visible
5. Performance remains smooth with 50+ cards

## Notes
- Keep animations subtle and professional
- Ensure accessibility is maintained
- Test on different screen sizes
- Consider touch device interactions 