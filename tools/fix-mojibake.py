#!/usr/bin/env python3
"""Sửa mojibake (double-encoded UTF-8 qua cp1252) cho 1 hoặc nhiều file.

Cách dùng:
    python3 tools/fix-mojibake.py assets/js/data.js
    python3 tools/fix-mojibake.py vi/welcome/index.html en/welcome/index.html

Thuật toán:
  Văn bản đã bị: UTF-8 encode -> cp1252 decode -> UTF-8 encode (lưu xuống đĩa).
  Để khôi phục: UTF-8 decode -> cp1252 encode (byte-fallback) -> UTF-8 decode.

cp1252 không định nghĩa một số codepoint (0x81, 0x8D, 0x8F, 0x90, 0x9D);
với những char đó ta dùng giá trị codepoint làm byte gốc (giả thiết
chúng vốn là byte raw chui qua Latin-1 fallback).
"""
import sys, os, shutil

CP1252_UNDEF = {0x81, 0x8D, 0x8F, 0x90, 0x9D}


def to_bytes(ch: str) -> bytes:
    cp = ord(ch)
    if cp <= 0x7F:
        return bytes([cp])
    if cp in CP1252_UNDEF or 0x80 <= cp <= 0xFF:
        try:
            return ch.encode("cp1252")
        except UnicodeEncodeError:
            return bytes([cp])
    try:
        return ch.encode("cp1252")
    except UnicodeEncodeError:
        return ch.encode("utf-8")


def fix_text_once(text: str) -> str:
    out = []
    i = 0
    n = len(text)
    while i < n:
        ch = text[i]
        if ord(ch) <= 0x7F:
            out.append(ch)
            i += 1
            continue
        buf = bytearray()
        j = i
        while j < n and ord(text[j]) > 0x7F:
            buf.extend(to_bytes(text[j]))
            j += 1
        try:
            decoded = buf.decode("utf-8")
        except UnicodeDecodeError:
            decoded = text[i:j]
        out.append(decoded)
        i = j
    return "".join(out)


MOJIBAKE_MARKERS = ("Ã", "Â", "â€", "Ä", "Å", "Æ", "Ð", "Ñ")


def looks_like_mojibake(text: str) -> bool:
    return any(m in text for m in MOJIBAKE_MARKERS)


def fix_text(text: str, max_passes: int = 8) -> str:
    """Apply fix_text_once repeatedly until stable or no more mojibake markers."""
    current = text
    for _ in range(max_passes):
        if not looks_like_mojibake(current):
            return current
        nxt = fix_text_once(current)
        if nxt == current:
            return current
        current = nxt
    return current


def has_bom(raw: bytes) -> bool:
    return raw.startswith(b"\xef\xbb\xbf")


def fix_file(path: str) -> bool:
    with open(path, "rb") as f:
        raw = f.read()
    bom = has_bom(raw)
    if bom:
        raw = raw[3:]
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as e:
        print(f"  [skip] {path}: not UTF-8 ({e})")
        return False
    fixed = fix_text(text)
    if fixed == text:
        print(f"  [unchanged] {path}")
        return False
    backup = path + ".pre-mojibake-fix.bak"
    if not os.path.exists(backup):
        shutil.copy2(path, backup)
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write(fixed)
    print(f"  [fixed] {path}  (backup: {backup})")
    return True


if __name__ == "__main__":
    paths = sys.argv[1:]
    if not paths:
        print(__doc__)
        sys.exit(1)
    changed = 0
    for p in paths:
        if fix_file(p):
            changed += 1
    print(f"Done. {changed}/{len(paths)} files changed.")
