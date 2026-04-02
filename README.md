# STEMORA Editorial Runtime

## Mục tiêu lần refactor này

Lần cập nhật này không chỉ đổi giao diện. Trọng tâm là làm trải nghiệm tải trang, vào trang, hiện media và chuyển động trở nên mượt hơn, có nhịp hơn và bớt cảm giác template.

Các thay đổi chính:

- Thay preloader giả bằng preloader theo asset thực, có tiến trình thật và fallback an toàn.
- Tạo lại nhịp vào trang theo thứ tự: shell, hero, copy/meta, rồi mới đến phần nội dung phụ và media dưới fold.
- Tách media thành ba mức ưu tiên `critical`, `near`, `deferred` để tránh pop-in hỗn loạn.
- Giảm kiểu reveal đồng loạt; mỗi section dùng một motion role chính thay vì mọi phần tử cùng fade-up.
- Ổn định layout bằng `aspect-ratio`, `width/height`, placeholder bền vững và frame media có trạng thái load rõ ràng.
- Giảm cảm giác card-grid/template ở catalogue, archive, related, contact và policy bằng nhịp editorial thoáng hơn.
- Làm mobile bớt nặng: menu phủ toàn màn hình, filter drawer ổn định hơn, motion ngắn hơn và parallax giảm mật độ.

## Cách preloader hoạt động

Preloader bây giờ do `assets/js/app.js` điều khiển qua các hàm:

- `getCriticalAssetsForPage()`
- `preloadImageSource()`
- `initPreloader()`
- `initPageExperience()`

Luồng chạy:

1. `getCriticalAssetsForPage()` xác định asset quan trọng theo loại trang hiện tại.
2. `initPreloader()` preload các asset này và cập nhật phần trăm theo tiến độ thật.
3. Giá trị phần trăm hiển thị được làm mượt bằng interpolation, không nhảy số cứng.
4. Nếu asset xong hoặc chạm fallback timeout thì preloader mới thoát.
5. Sau khi preloader rời đi, `initPageExperience()` mới mở shell và chạy nhịp reveal theo stage.

Ngưỡng timing mặc định nằm trong `assets/js/data.js` tại:

- `runtimeTuning.preloader.firstVisitFallback`
- `runtimeTuning.preloader.repeatVisitFallback`
- `runtimeTuning.staging.shellDelay`
- `runtimeTuning.staging.heroDelay`
- `runtimeTuning.staging.copyDelay`
- `runtimeTuning.staging.secondaryDelay`

## Quản lý thứ tự ưu tiên media

Tất cả media render qua `renderMedia()` trong `assets/js/app.js`.

Media hiện chia 3 tầng:

- `critical`: gắn `src` ngay, ưu tiên hero và phần trên fold quan trọng.
- `near`: render placeholder ổn định trước, sau đó nạp theo batch nhỏ ngay sau khi shell vào nhịp.
- `deferred`: giữ placeholder và chỉ nạp khi gần viewport qua `IntersectionObserver`.

Các hàm liên quan:

- `renderMedia()`: gắn `data-media-tier`, placeholder và metadata ổn định.
- `bindStableMedia()`: theo dõi frame media và chỉ đánh dấu loaded khi ảnh thật xong.
- `ensureImageReady()`: ép ảnh hiện tại decode xong trước khi coi như sẵn sàng.
- `loadMediaBatch()`: nạp ảnh theo lô nhỏ, tránh decode quá nhiều cùng lúc.
- `initMediaPriorityLoading()`: khởi động near/deferred loading sau khi hero ổn định.

Batch size và vùng observer có thể chỉnh trong `assets/js/data.js`:

- `runtimeTuning.media.nearCriticalBatch`
- `runtimeTuning.media.deferredBatch`
- `runtimeTuning.media.observerMargin`

## Motion system mới

Site không còn dựa chủ yếu vào một lớp reveal chung. Runtime hiện dùng hai lớp điều phối:

### 1. Stage cho phần đầu trang

Dùng `data-stage` để dàn nhịp vào trang:

- `hero`
- `copy`
- `secondary`

Các stage này được kích hoạt bởi class trên `body`:

- `.is-shell-visible`
- `.is-hero-visible`
- `.is-copy-visible`
- `.is-secondary-visible`

### 2. Motion role cho section dưới fold

Dùng `data-motion` với vai trò rõ ràng hơn:

- `scene-enter`
- `text-stagger`
- `media-reveal`
- `hero-enter`
- `collage-reveal`
- `cta-soft`
- `fade-left`
- `fade-right`
- `stagger-group`

Phần CSS nằm chủ yếu trong `assets/css/main.css` ở block:

- `motion utilities`
- `preloader/transition/menu`
- các section riêng của welcome, catalogue, detail, archive, contact, policy

Logic observer nằm trong:

- `initScrollMotion()`
- `initParallaxScenes()`

## Chuyển trang và chống flash trắng

Transition layer bây giờ không chỉ fade ngắn rồi bỏ. Luồng hiện tại:

1. Click link có `data-transition` sẽ bật overlay và khóa trang hiện tại.
2. `sessionStorage` giữ cờ transition pending giữa hai trang.
3. Trang đích giữ overlay trong lúc preloader + stage đầu trang hoàn tất.
4. Overlay chỉ nhả khi hero/copy đã ổn định, tránh cảm giác hard-pop.

Timing có thể chỉnh trong `assets/js/data.js`:

- `runtimeTuning.transitions.leaveDuration`
- `runtimeTuning.transitions.releaseDelay`

CSS liên quan nằm trong `assets/css/main.css`:

- `.transition-layer`
- `.transition-layer__mark`
- `.preloader`
- `.page-shell`
- `[data-stage]`

## File nào điều khiển phần nào

`assets/js/data.js`

- dữ liệu site shell
- runtime tuning
- taxonomy
- welcome scenes / collage / quotes / stats
- product data
- project data
- policy data

`assets/js/app.js`

- render shell toàn site
- menu overlay
- preloader thật
- transition overlay
- stage reveal đầu trang
- motion observer
- parallax nhẹ
- media batching và deferred loading
- filter catalogue
- render welcome / products / product detail / projects / project detail / contact / policy

`assets/css/main.css`

- token màu, spacing, radius, shadow
- typography
- shell/header/footer
- preloader và transition
- motion utilities
- stable media frame
- layout welcome
- catalogue / detail / archive / contact / policy
- responsive behavior

## Các phần vẫn data-driven

Bạn có thể thay nội dung mà không cần sửa HTML route:

- welcome scenes: `welcomeScenes`, `welcomeCollage`, `welcomeQuotes`, `welcomeStats`
- taxonomy và filter: `taxonomy`
- products: `products`
- projects: `projects`
- policies: `policies`
- shell copy và menu/footer/contact: `locales`, `siteMeta`

## Cách thay media và nội dung demo

1. Thay file trong `assets/img/`.
2. Cập nhật object media tương ứng trong `assets/js/data.js`.
3. Nếu thêm product/project/policy mới, thêm object dữ liệu và tạo route `vi/` + `en/` tương ứng.
4. Nếu muốn đổi nhịp tải hoặc chuyển trang, chỉnh `runtimeTuning` trước, rồi mới chỉnh CSS transition nếu cần.

## Chạy local

Serve project như một static site từ thư mục gốc:

```bash
python -m http.server 5500
```

Sau đó mở `http://localhost:5500`.
