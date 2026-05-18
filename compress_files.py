"""
Compress CLAUDE.md and memory files using LLMLingua-2.
Saves originals as .original.md backups before overwriting.
"""

import os
import shutil
from llmlingua import PromptCompressor

MEMORY_DIR = os.path.expanduser(
    "~/.claude/projects/-Users-ramyachowdary-Documents-prem-work-study-project/memory"
)
CLAUDE_MD = os.path.join(
    os.path.dirname(__file__), "CLAUDE.md"
)

TARGET_FILES = [CLAUDE_MD] + [
    os.path.join(MEMORY_DIR, f)
    for f in os.listdir(MEMORY_DIR)
    if f.endswith(".md") and not f.endswith(".original.md")
]

RATE = 0.5  # keep 50% of tokens

print("Loading LLMLingua-2 model (downloads on first run)...")
compressor = PromptCompressor(
    model_name="microsoft/llmlingua-2-bert-base-multilingual-cased-meetingbank",
    use_llmlingua2=True,
    device_map="cpu",
)
print("Model loaded.\n")

total_before = 0
total_after = 0

for path in TARGET_FILES:
    if not os.path.exists(path):
        print(f"SKIP (not found): {path}")
        continue

    with open(path, "r", encoding="utf-8") as f:
        original = f.read()

    size_before = len(original)
    total_before += size_before

    # Backup original
    backup = path.replace(".md", ".original.md")
    shutil.copy2(path, backup)

    # Compress — preserve newlines and ? as forced tokens
    result = compressor.compress_prompt(
        original,
        rate=RATE,
        force_tokens=["\n", "?", "✅", "│", "└", "├", "─"],
    )
    compressed = result["compressed_prompt"]

    size_after = len(compressed)
    total_after += size_after

    with open(path, "w", encoding="utf-8") as f:
        f.write(compressed)

    ratio = (1 - size_after / size_before) * 100
    print(f"{os.path.basename(path)}: {size_before}B → {size_after}B  ({ratio:.1f}% reduction)")
    print(f"  backup: {os.path.basename(backup)}\n")

overall = (1 - total_after / total_before) * 100
print(f"TOTAL: {total_before}B → {total_after}B  ({overall:.1f}% reduction)")
