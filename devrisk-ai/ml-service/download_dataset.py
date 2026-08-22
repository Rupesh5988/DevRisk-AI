"""
============================================================
ApacheJIT Dataset Downloader
============================================================
Downloads the official ApacheJIT dataset from Zenodo.

Source: Keshavarz & Nagappan (MSR 2022)
DOI: 10.5281/zenodo.5907002

The dataset contains 106,674 real commits from Apache
open-source projects with pre-computed change-pattern features.

Usage:
    python download_dataset.py

Output:
    data/apachejit_total.csv     (full dataset ~106K commits)
    data/apachejit_train.csv     (balanced training subset)
============================================================
"""

import os
import requests
import pandas as pd

# ============================================================
# OFFICIAL Zenodo download URLs (verified & working)
# ============================================================

ZENODO_FILES = {
    "apachejit_total.csv": "https://zenodo.org/api/records/5907002/files/apachejit_total.csv/content",
    "apachejit_train.csv": "https://zenodo.org/api/records/5907002/files/apachejit_train.csv/content",
}

# The 14 features we use for training (ApacheJIT change-pattern metrics)
FEATURE_COLUMNS = [
    "ns",       # Number of modified subsystems
    "nd",       # Number of modified directories
    "nf",       # Number of modified files
    "entropy",  # Spread of changes across files (Shannon entropy)
    "la",       # Lines added
    "ld",       # Lines deleted
    "lt",       # Lines of code in modified files (before change)
    "fix",      # Whether the commit is a bug-fix (1/0)
    "ndev",     # Number of distinct prior developers on modified files
    "age",      # Average age of modified files (days since last change)
    "nuc",      # Number of unique prior changes to modified files
    "exp",      # Developer experience (total prior commits)
    "rexp",     # Recent developer experience (commits in last period)
    "sexp",     # Subsystem-specific developer experience
]

LABEL_COLUMN = "buggy"  # 1 = buggy commit, 0 = clean commit

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")


def download_file(url, filepath):
    """Downloads a file from a URL and saves it to disk."""
    print(f"  ⬇️  Downloading: {os.path.basename(filepath)}")
    print(f"     URL: {url}")

    response = requests.get(url, timeout=120, stream=True)
    response.raise_for_status()

    # Write in chunks for large files
    total_size = int(response.headers.get("content-length", 0))
    downloaded = 0

    with open(filepath, "wb") as f:
        for chunk in response.iter_content(chunk_size=8192):
            if chunk:
                f.write(chunk)
                downloaded += len(chunk)
                if total_size > 0:
                    pct = (downloaded / total_size) * 100
                    print(f"\r     Progress: {downloaded // 1024}KB / {total_size // 1024}KB ({pct:.0f}%)", end="")

    print(f"\n  ✅ Saved: {filepath} ({os.path.getsize(filepath) // 1024}KB)")


def download_dataset():
    """
    Downloads the ApacheJIT dataset from Zenodo.
    Downloads both apachejit_total.csv and apachejit_train.csv.
    """
    os.makedirs(DATA_DIR, exist_ok=True)

    print("=" * 60)
    print("ApacheJIT Dataset Downloader (from Zenodo)")
    print("DOI: 10.5281/zenodo.5907002")
    print("=" * 60)

    downloaded_files = []

    for filename, url in ZENODO_FILES.items():
        filepath = os.path.join(DATA_DIR, filename)

        # Skip if already downloaded
        if os.path.exists(filepath) and os.path.getsize(filepath) > 1000:
            print(f"\n  ✅ Already exists: {filename} ({os.path.getsize(filepath) // 1024}KB)")
            downloaded_files.append(filepath)
            continue

        try:
            download_file(url, filepath)
            downloaded_files.append(filepath)
        except Exception as e:
            print(f"\n  ❌ Failed to download {filename}: {e}")

    if not downloaded_files:
        print("\n❌ No files downloaded. Creating synthetic dataset for development...")
        create_synthetic_dataset()
        return

    # Analyze the main dataset
    main_file = os.path.join(DATA_DIR, "apachejit_total.csv")
    if not os.path.exists(main_file):
        main_file = downloaded_files[0]

    print(f"\n{'=' * 60}")
    print("Analyzing downloaded dataset...")
    print(f"{'=' * 60}")

    df = pd.read_csv(main_file)
    print(f"\n  📊 File: {os.path.basename(main_file)}")
    print(f"  Total commits: {len(df)}")
    print(f"  Columns: {list(df.columns)}")

    # ---- COLUMN RENAMING ----
    # The ApacheJIT dataset uses different names than our standard:
    #   ent   → entropy
    #   aexp  → exp
    #   arexp → rexp
    #   asexp → sexp
    COLUMN_MAP = {
        "ent": "entropy",
        "aexp": "exp",
        "arexp": "rexp",
        "asexp": "sexp",
    }
    df = df.rename(columns=COLUMN_MAP)
    renamed = {k: v for k, v in COLUMN_MAP.items() if k in df.columns or v in df.columns}
    if renamed:
        print(f"\n  🔄 Renamed columns: {renamed}")

    # Compute missing 'lt' (lines of code in modified files before change)
    # Approximate as la + ld (total churn), since the real value isn't in the dataset
    if "lt" not in df.columns:
        df["lt"] = df.get("la", 0) + df.get("ld", 0)
        print(f"  🔧 Computed 'lt' = la + ld (approximation)")

    # Check which of our 14 features exist after renaming
    available = [col for col in FEATURE_COLUMNS if col in df.columns]
    missing = [col for col in FEATURE_COLUMNS if col not in df.columns]

    print(f"\n  Available features ({len(available)}/14): {available}")
    if missing:
        print(f"  ⚠️  Still missing: {missing} (will be filled with 0)")
        for col in missing:
            df[col] = 0

    # Check for label column
    label_col = None
    for candidate in [LABEL_COLUMN, "bug", "is_buggy", "label", "defective"]:
        if candidate in df.columns:
            label_col = candidate
            break

    if label_col:
        buggy_count = df[label_col].sum()
        clean_count = len(df) - buggy_count
        print(f"\n  Label column: '{label_col}'")
        print(f"  Buggy commits: {int(buggy_count)} ({buggy_count / len(df) * 100:.1f}%)")
        print(f"  Clean commits: {int(clean_count)} ({clean_count / len(df) * 100:.1f}%)")

        # Rename label column to standard name if different
        if label_col != LABEL_COLUMN:
            df = df.rename(columns={label_col: LABEL_COLUMN})
    else:
        print("\n  ⚠️  No label column found in the dataset")

    # Create a combined CSV with only our needed columns (all 14 + label)
    final_cols = FEATURE_COLUMNS + [LABEL_COLUMN]
    df_clean = df[final_cols].copy()
    df_clean = df_clean.fillna(0)

    combined_path = os.path.join(DATA_DIR, "apachejit_combined.csv")
    df_clean.to_csv(combined_path, index=False)

    print(f"\n  ✅ Cleaned dataset saved: {combined_path}")
    print(f"     Rows: {len(df_clean)} | Features: {len(final_cols) - 1}")
    print(f"\n{'=' * 60}")
    print("✅ Dataset download complete!")
    print(f"{'=' * 60}")

    return df_clean


def create_synthetic_dataset():
    """
    Creates a synthetic dataset with realistic distributions
    for development/testing when the real dataset is unavailable.
    """
    import numpy as np
    np.random.seed(42)

    n_samples = 10000
    print(f"\n📦 Generating synthetic dataset with {n_samples} samples...")

    data = {
        "ns": np.random.poisson(2, n_samples) + 1,
        "nd": np.random.poisson(3, n_samples) + 1,
        "nf": np.random.poisson(4, n_samples) + 1,
        "entropy": np.random.exponential(0.5, n_samples),
        "la": np.random.exponential(50, n_samples).astype(int),
        "ld": np.random.exponential(30, n_samples).astype(int),
        "lt": np.random.exponential(500, n_samples).astype(int),
        "fix": np.random.choice([0, 1], n_samples, p=[0.7, 0.3]),
        "ndev": np.random.poisson(3, n_samples) + 1,
        "age": np.random.exponential(100, n_samples),
        "nuc": np.random.poisson(10, n_samples) + 1,
        "exp": np.random.poisson(20, n_samples) + 1,
        "rexp": np.random.poisson(5, n_samples),
        "sexp": np.random.poisson(8, n_samples),
    }

    df = pd.DataFrame(data)

    # Create realistic buggy label based on features
    risk_signal = (
        0.15 * (df["nf"] / df["nf"].max())
        + 0.15 * (df["la"] / df["la"].max())
        + 0.10 * (df["ld"] / df["ld"].max())
        + 0.15 * (1 - df["exp"] / df["exp"].max())
        + 0.10 * (df["age"] / df["age"].max())
        + 0.10 * (df["entropy"] / df["entropy"].max())
        + 0.10 * (df["ns"] / df["ns"].max())
        + 0.05 * df["fix"]
        + np.random.normal(0, 0.1, n_samples)
    )

    threshold = np.percentile(risk_signal, 80)
    df["buggy"] = (risk_signal > threshold).astype(int)

    output_path = os.path.join(DATA_DIR, "apachejit_combined.csv")
    df.to_csv(output_path, index=False)

    print(f"✅ Synthetic dataset saved: {output_path}")
    print(f"   Total: {len(df)} | Buggy: {df['buggy'].sum()} ({df['buggy'].mean()*100:.1f}%)")

    return df


if __name__ == "__main__":
    download_dataset()
