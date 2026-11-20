# Credits

## Asset
| Thành phần | Nguồn | Giấy phép |
|---|---|---|
| Mô hình 3D (Mây, đèn, Bóng Mực, Gió Lạc, Bùa Gió, đảo, cầu, tháp, cây, đá) | Tự dựng từ khối hình học có sẵn của Three.js (sphere, cone, cylinder, extrude, icosahedron…) trong code | Code của repo (MIT) |
| Âm thanh (nhạc nền đêm, hiệu ứng) | Tổng hợp lúc chạy bằng WebAudio (`src/web/audio.js`), không có file âm thanh | Code của repo (MIT) |
| Font chữ | Font hệ thống (`system-ui`) | — |
| Emoji trên HUD (🔥 💨 ✨ 🍃 ⚠) | Font emoji của hệ điều hành | — |
| Bối cảnh, nhân vật, tên gọi | Đề bài lab Day 12 AI SDLC (`docs/lab/`) | Thuộc khóa học |

Không dùng asset bên ngoài, asset tải về, hay nội dung có bản quyền của game hoặc phim khác.

## Thư viện
| Thư viện | Dùng cho | Giấy phép |
|---|---|---|
| [three.js](https://threejs.org) r187 | Dựng hình 3D | MIT |
| [Vite](https://vitejs.dev) 8 | Dev server, build, plugin lưu bảng xếp hạng | MIT |
| Node.js (`node:test`, `node:fs`…) | Headless, test, bench/soak runner | MIT |

## Công cụ AI
| Công cụ | Dùng để |
|---|---|
| Claude Code (Anthropic, model Claude Opus) | Đọc đề, lập kế hoạch, viết code, test, script bằng chứng và tài liệu dưới sự điều phối và kiểm tra của tác giả. Không dùng AI để tạo hình ảnh hay âm thanh. Chi tiết trong [docs/notes/ai-log.md](docs/notes/ai-log.md) |
