"""
State Machine - Enforces valid state transitions for orders and other entities.
Prevents invalid transitions and provides clear error messages.
"""

from typing import Dict, Set, Optional, List, Tuple
from fastapi import HTTPException


class OrderStateMachine:
    """Defines and enforces valid order status transitions"""
    
    # Define valid states
    VALID_STATES = {
        'scheduled',
        'prep_pending',
        'pending',
        'preparing',
        'in_prep',
        'ready_for_packing',
        'packed',
        'ready_for_pickup',
        'ready',
        'assigned',
        'picked_up',
        'picked-up',  # Allow both formats
        'out_for_delivery',
        'in_transit',
        'in-transit',  # Allow both formats
        'delivered',
        'completed',
        'cancelled',
        'failed',
        'skipped'
    }
    
    # Define valid transitions: {from_state: {to_state1, to_state2, ...}}
    VALID_TRANSITIONS: Dict[str, Set[str]] = {
        'scheduled': {'prep_pending', 'pending', 'cancelled', 'failed'},
        'prep_pending': {'in_prep', 'preparing', 'cancelled', 'failed'},
        'pending': {'prep_pending', 'preparing', 'in_prep', 'cancelled', 'failed', 'skipped'},
        'preparing': {'in_prep', 'ready_for_packing', 'packed', 'cancelled', 'failed'},
        'in_prep': {'ready_for_packing', 'packed', 'cancelled', 'failed'},
        'ready_for_packing': {'packed', 'cancelled', 'failed'},
        'packed': {'ready_for_pickup', 'ready', 'assigned', 'cancelled', 'failed'},
        'ready_for_pickup': {'ready', 'assigned', 'picked_up', 'picked-up', 'cancelled', 'failed'},
        'ready': {'assigned', 'picked_up', 'picked-up', 'cancelled', 'failed'},
        'assigned': {'picked_up', 'picked-up', 'cancelled', 'failed'},
        'picked_up': {'out_for_delivery', 'in_transit', 'in-transit', 'delivered'},
        'picked-up': {'out_for_delivery', 'in_transit', 'in-transit', 'delivered'},  # Support both formats
        'out_for_delivery': {'in_transit', 'in-transit', 'delivered'},
        'in_transit': {'delivered', 'in_transit', 'in-transit'},  # Allow status updates during transit
        'in-transit': {'delivered', 'in_transit', 'in-transit'},
        'delivered': {'completed'},
        'completed': set(),  # Terminal state
        'cancelled': set(),  # Terminal state
        'failed': set(),  # Terminal state
        'skipped': set()  # Terminal state
    }
    
    @classmethod
    def normalize_status(cls, status: str) -> str:
        """Normalize status string (handle hyphens vs underscores)"""
        # Normalize to use underscores
        normalized = status.replace('-', '_')
        return normalized
    
    @classmethod
    def is_valid_state(cls, status: str) -> bool:
        """Check if a status is valid"""
        normalized = cls.normalize_status(status)
        return normalized in cls.VALID_STATES
    
    @classmethod
    def is_valid_transition(cls, from_status: str, to_status: str) -> Tuple[bool, Optional[str]]:
        """
        Check if a state transition is valid.
        
        Args:
            from_status: Current status
            to_status: Desired new status
            
        Returns:
            (is_valid, error_message)
        """
        from_norm = cls.normalize_status(from_status)
        to_norm = cls.normalize_status(to_status)
        
        # Check if both states are valid
        if from_norm not in cls.VALID_STATES:
            return False, f"Invalid current status: {from_status}"
        
        if to_norm not in cls.VALID_STATES:
            return False, f"Invalid target status: {to_status}"
        
        # Check if transition is allowed
        allowed_transitions = cls.VALID_TRANSITIONS.get(from_norm, set())
        
        # Also check if we allow the hyphenated version
        if to_norm in allowed_transitions or to_status in allowed_transitions:
            return True, None
        
        # If from status allows transitions but this one isn't in the set
        if allowed_transitions:
            return False, (
                f"Invalid transition from '{from_status}' to '{to_status}'. "
                f"Allowed transitions: {', '.join(sorted(allowed_transitions))}"
            )
        
        # Terminal state - no transitions allowed
        return False, f"Cannot transition from terminal state '{from_status}'"
    
    @classmethod
    def validate_transition(cls, from_status: str, to_status: str) -> None:
        """
        Validate a state transition and raise HTTPException if invalid.
        
        Args:
            from_status: Current status
            to_status: Desired new status
            
        Raises:
            HTTPException: If transition is invalid
        """
        is_valid, error_message = cls.is_valid_transition(from_status, to_status)
        if not is_valid:
            raise HTTPException(
                status_code=400,
                detail=error_message or f"Invalid state transition from '{from_status}' to '{to_status}'"
            )
    
    @classmethod
    def get_allowed_transitions(cls, current_status: str) -> List[str]:
        """
        Get list of allowed transitions from current status.
        
        Args:
            current_status: Current status
            
        Returns:
            List of allowed next statuses
        """
        normalized = cls.normalize_status(current_status)
        allowed = cls.VALID_TRANSITIONS.get(normalized, set())
        return sorted(allowed)


class KitchenStatusStateMachine:
    """Defines and enforces valid kitchen status transitions"""
    
    VALID_STATES = {'pending', 'preparing', 'ready', 'packed', 'completed'}
    
    VALID_TRANSITIONS: Dict[str, Set[str]] = {
        'pending': {'preparing', 'completed'},  # Can skip to completed if cancelled early
        'preparing': {'ready', 'completed'},
        'ready': {'packed', 'completed'},
        'packed': {'completed'},
        'completed': set()  # Terminal state
    }
    
    @classmethod
    def validate_transition(cls, from_status: str, to_status: str) -> None:
        """Validate kitchen status transition"""
        if from_status not in cls.VALID_STATES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid current kitchen status: {from_status}"
            )
        
        if to_status not in cls.VALID_STATES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid target kitchen status: {to_status}"
            )
        
        allowed = cls.VALID_TRANSITIONS.get(from_status, set())
        if to_status not in allowed:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Invalid transition from '{from_status}' to '{to_status}'. "
                    f"Allowed: {', '.join(sorted(allowed))}"
                )
            )

