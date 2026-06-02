#!/usr/bin/env bash
# Xoá file chứa PII khỏi TOÀN BỘ lịch sử git rồi force-push.
#
# !!! THAO TÁC PHÁ HOẠI - KHÔNG TỰ CHẠY KHI CHƯA ĐỌC HẾT  !!!
#
# Lý do tồn tại: commit 60cb868 chứa
#   - migration-full-input/users.json     (16 user thật, bcrypt hash, Google ID, SĐT)
#   - migration-full-input/orders.json    (2.2 MB đơn hàng thật)
#   - migration-full-input/customers.json (PII khách hàng)
# Phải xoá khỏi history, không chỉ HEAD.
#
# Trước khi chạy:
#   1. Đảm bảo bạn là người duy nhất push được tới repo (hoặc đã thông báo team).
#   2. Backup toàn bộ repo:        cp -r . ../SmartSteamVer2-backup
#   3. Lưu 3 file PII offline ngoài git (nếu vẫn cần data đó).
#   4. Cài git-filter-repo:
#        Ubuntu/Debian: sudo apt install git-filter-repo
#        Mac:           brew install git-filter-repo
#        Pip:           pip install --user git-filter-repo
#
# Sau khi chạy script này:
#   - Mỗi cộng tác viên phải clone lại repo. KHÔNG được `git pull` trên clone cũ.
#   - GitHub vẫn cache commit cũ vài giờ ở snapshot. Mở GitHub Support đề nghị
#     purge cache nếu cần (https://docs.github.com/en/rest/repos/contents#purge-a-cached-blob).
#   - Reset password & revoke OAuth token cho 16 user trong users.json.
#   - Thông báo data breach theo Nghị định 13/2023/NĐ-CP.
#
# Cách chạy:
#   bash tools/scrub-git-history.sh

set -euo pipefail

if ! command -v git-filter-repo >/dev/null 2>&1; then
  echo "Chưa có git-filter-repo. Cài đặt:"
  echo "  Ubuntu/Debian:  sudo apt install git-filter-repo"
  echo "  macOS:          brew install git-filter-repo"
  echo "  Pip:            pip install --user git-filter-repo"
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree không sạch. Commit hoặc stash trước khi chạy."
  exit 1
fi

echo ">>> Đã backup chưa? (yes/no)"
read -r ack
[[ "$ack" == "yes" ]] || { echo "Huỷ. Hãy backup trước."; exit 1; }

PATHS_TO_PURGE=(
  "migration-full-input/users.json"
  "migration-full-input/orders.json"
  "migration-full-input/customers.json"
  "migration-full.zip"
  "transformed-products.js"
  "out.txt"
)

echo ">>> Xoá khỏi history các file sau:"
printf '   - %s\n' "${PATHS_TO_PURGE[@]}"
echo ">>> Nhập 'PURGE' để xác nhận:"
read -r confirm
[[ "$confirm" == "PURGE" ]] || { echo "Huỷ."; exit 1; }

ARGS=()
for p in "${PATHS_TO_PURGE[@]}"; do
  ARGS+=(--path "$p")
done

git filter-repo --force --invert-paths "${ARGS[@]}"

echo ""
echo "✓ Đã filter xong. Kiểm tra lại bằng:"
echo "    git log --all --oneline -- migration-full-input/users.json"
echo "    (kỳ vọng: không có dòng nào)"
echo ""
echo "Tiếp theo (THỦ CÔNG, không chạy tự động):"
echo "    git remote add origin <url>          # filter-repo gỡ remote, phải add lại"
echo "    git push --force --all origin"
echo "    git push --force --tags origin"
echo ""
echo "Sau khi push:"
echo "    1. Báo team clone lại repo từ đầu."
echo "    2. Reset password + revoke OAuth cho 16 user trong users.json."
echo "    3. Mở ticket GitHub Support yêu cầu purge cache nếu repo public."
