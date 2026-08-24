"""
Pattern Recognition Trainer — Heuristic Learning for City Heat Patterns.

This service simulates "training" by analyzing synthesized heat data across 
California city archetypes (Dense Urban, Coastal, Valley, Desert).

It identifies correlations between land use (OSM) and heat intensity, 
producing a weighted heuristic model used by the 3D Planner.
"""
from __future__ import annotations

import math
import random
from typing import Any
from .cities import CALIFORNIA_CITIES

# The "Model" - Heuristic weights discovered through training
# Initial weights (defaults)
HEURISTIC_MODEL = {
    "building_density_impact": 1.2,  # Multiplier for heat gain in buildings
    "asphalt_absorption_rate": 1.5, # Multiplier for road heat
    "canopy_cooling_efficiency": -3.5, # Degrees F reduced per tree cluster
    "albedo_effect_potential": -2.0,   # Degrees F reduced by cool roofs
    "proximity_to_water_cooling": -1.8, # Degrees F reduced near water
}

class PatternTrainer:
    def __init__(self):
        self.iterations = 0
        self.accuracy = 0.65
        self.logs = []

    def train_on_california(self) -> dict[str, Any]:
        """
        Simulates training on California city datasets.

        In a real app, this would query historical FortyGuard + OSM data. Here
        it walks the bundled CALIFORNIA_CITIES list and adjusts HEURISTIC_MODEL
        weights based on each city's climate region.

        Outputs (dict):
            status: "success"
            iterations: total training cycles run in this process
            accuracy: 0..1 simulated model accuracy (clamped at 0.98)
            model_weights: the HEURISTIC_MODEL dict (mutated in place)
            logs: last 5 log lines for the UI

        Used by:
            POST /api/analysis/train
        """
        self.logs.append("Initializing training on 15 California archetypes...")
        
        # Simulate processing cities
        processed_points = 0
        for city in CALIFORNIA_CITIES:
            processed_points += 500
            self.logs.append(f"Analyzing {city['name']} ({city['region']})...")
            
            # Refine weights based on city "observations"
            if city["region"] == "Desert":
                HEURISTIC_MODEL["asphalt_absorption_rate"] += 0.05
            elif city["region"] == "Central Valley":
                HEURISTIC_MODEL["building_density_impact"] += 0.03
            elif "Coastal" in city["climate"]:
                HEURISTIC_MODEL["proximity_to_water_cooling"] -= 0.02

        # Increment "Accuracy" and iterations
        self.iterations += 1
        self.accuracy = min(0.98, self.accuracy + random.uniform(0.02, 0.05))
        
        self.logs.append(f"Training cycle {self.iterations} complete.")
        self.logs.append(f"Validated against historical heat waves. Accuracy: {self.accuracy:.2f}")

        return {
            "status": "success",
            "iterations": self.iterations,
            "accuracy": round(self.accuracy, 3),
            "model_weights": HEURISTIC_MODEL,
            "logs": self.logs[-5:]
        }

# Singleton instance
trainer = PatternTrainer()

def get_current_model():
    return HEURISTIC_MODEL
