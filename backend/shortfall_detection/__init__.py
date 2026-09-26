"""
Shortfall Detection Package for Cashflow Guardian.
Provides mathematical trajectory computation, algorithmic root-cause analysis,
and rule-based mitigation strategy generation.
"""

from .engine import calculate_shortfall_trajectory
from .reasoning import analyze_shortfall_reasons
from .mitigation import generate_mitigation_strategies

__all__ = [
    "calculate_shortfall_trajectory",
    "analyze_shortfall_reasons",
    "generate_mitigation_strategies"
]
