"""
============================================================
Live Inference Sanity Test
============================================================
"""

import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

from app.predictor import predictor

def main():
    print("=" * 60)
    print("  Live Commit Inference Sanity Test")
    print("=" * 60)

    if not predictor.is_loaded:
        print("❌ Model failed to load.")
        return

    # Raw features: ["ns", "nd", "nf", "entropy", "la", "ld", "lt", "fix", "ndev", "age", "nuc", "exp", "rexp", "sexp"]
    
    # Commit A: Low Risk Profile
    # Few files, low entropy, small additions, feature/not fix, highly experienced developer
    commit_a_raw = [1, 1, 2, 0.1, 15, 5, 200, 0, 1, 365, 10, 500, 50, 200]
    
    # Commit B: High Risk Profile
    # High subsystem/file count, high entropy, large additions, bug fix, low experience developer
    commit_b_raw = [5, 8, 15, 3.5, 850, 45, 1200, 1, 15, 2, 2, 5, 1, 1]
    
    threshold = 0.37

    # Evaluate Commit A
    pred_a = predictor.predict(commit_a_raw)
    prob_a = pred_a["confidence"]
    label_a = "BUGGY ❌" if prob_a >= threshold else "CLEAN ✅"

    print("\n[Commit A] Small feature by Veteran Dev:")
    print(f"  Risk Score:  {pred_a['risk_score']}%")
    print(f"  Probability: {prob_a:.4f}")
    print(f"  Threshold:   {threshold}")
    print(f"  Prediction:  {label_a}")

    # Evaluate Commit B
    pred_b = predictor.predict(commit_b_raw)
    prob_b = pred_b["confidence"]
    label_b = "BUGGY ❌" if prob_b >= threshold else "CLEAN ✅"

    print("\n[Commit B] Large refactor/fix by Junior Dev:")
    print(f"  Risk Score:  {pred_b['risk_score']}%")
    print(f"  Probability: {prob_b:.4f}")
    print(f"  Threshold:   {threshold}")
    print(f"  Prediction:  {label_b}")
    
    print("\n✅ Sanity test complete.\n")

if __name__ == "__main__":
    main()
