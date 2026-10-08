"""
============================================================
DevRisk AI — ML Service Quick Start
============================================================
Run this script to:
  1. Download the dataset (if not already downloaded)
  2. Train the model (if not already trained)
  3. Start the FastAPI server

Usage:
    python run.py
============================================================
"""

import os
import sys
import subprocess

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "apachejit_combined.csv")
MODEL_PATH = os.path.join(BASE_DIR, "model", "xgboost_model.pkl")


def main():
    print("=" * 60)
    print("  DevRisk AI — ML Service Quick Start")
    print("=" * 60)

    # Step 1: Check if dataset exists
    if not os.path.exists(DATA_PATH):
        print("\n📦 Dataset not found. Downloading...")
        subprocess.run([sys.executable, "download_dataset.py"], cwd=BASE_DIR, check=True)
    else:
        print(f"\n✅ Dataset found: {DATA_PATH}")

    # Step 2: Check if model exists
    if not os.path.exists(MODEL_PATH):
        print("\n🧠 Model not found. Training...")
        subprocess.run([sys.executable, "train_model.py"], cwd=BASE_DIR, check=True)
    else:
        print(f"✅ Model found: {MODEL_PATH}")

    # Step 3: Start FastAPI server
    print("\n🚀 Starting FastAPI ML server on http://localhost:8000")
    print("   Swagger docs: http://localhost:8000/docs")
    print("   Press Ctrl+C to stop\n")

    subprocess.run(
        [sys.executable, "-m", "uvicorn", "app.main:app",
         "--host", "0.0.0.0", "--port", "8000", "--reload"],
        cwd=BASE_DIR,
    )


if __name__ == "__main__":
    main()
