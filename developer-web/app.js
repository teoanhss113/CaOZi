const sampleJson = {
  v: "5.7.4", fr: 60, ip: 0, op: 180, w: 512, h: 512, nm: "PetMotion Happy Orb", ddd: 0, assets: [],
  layers: [
    { ddd: 0, ind: 1, ty: 4, nm: "Face", sr: 1, ks: { o: { a: 0, k: 100 }, r: { a: 1, k: [{ t: 0, s: [-4] }, { t: 90, s: [4] }, { t: 180, s: [-4] }] }, p: { a: 1, k: [{ t: 0, s: [256, 250, 0] }, { t: 90, s: [256, 265, 0] }, { t: 180, s: [256, 250, 0] }] }, a: { a: 0, k: [0, 0, 0] }, s: { a: 1, k: [{ t: 0, s: [94, 94, 100] }, { t: 90, s: [104, 104, 100] }, { t: 180, s: [94, 94, 100] }] } }, ao: 0,
      shapes: [
        { ty: "gr", it: [{ d: 1, ty: "el", s: { a: 0, k: [240, 220] }, p: { a: 0, k: [0, 0] }, nm: "Head" }, { ty: "fl", c: { a: 0, k: [0.46, 0.34, 1, 1] }, o: { a: 0, k: 100 }, r: 1 }, { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }], nm: "Head Group" },
        { ty: "gr", it: [{ d: 1, ty: "el", s: { a: 0, k: [25, 34] }, p: { a: 0, k: [-44, -20] } }, { d: 1, ty: "el", s: { a: 0, k: [25, 34] }, p: { a: 0, k: [44, -20] } }, { ty: "fl", c: { a: 0, k: [1, 1, 1, 1] }, o: { a: 0, k: 100 }, r: 1 }, { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }], nm: "Eyes" },
        { ty: "gr", it: [{ d: 1, ty: "rc", s: { a: 0, k: [62, 12] }, p: { a: 0, k: [0, 45] }, r: { a: 0, k: 7 } }, { ty: "fl", c: { a: 0, k: [0.12, 0.08, 0.25, 1] }, o: { a: 0, k: 100 }, r: 1 }, { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }], nm: "Smile" }
      ], ip: 0, op: 180, st: 0, bm: 0 }
  ], markers: []
};

const animations = [
  { name: "Happy Bounce", file: "happy_loop.json", bg: "#e6f7f2", status: "published", views: "4.8K", size: "38 KB", path: "../assets/Pets/Libra/512/states_2/happy_3.json" },
  { name: "Gacha Surprise", file: "gacha_reveal.json", bg: "#fff2df", status: "published", views: "3.2K", size: "51 KB", path: "../assets/Pets/Virgo/512/gacha.json" },
  { name: "Sleepy Float", file: "sleepy_float.json", bg: "#edf0ff", status: "draft", views: "—", size: "46 KB", path: "../assets/Pets/Pisces/512/homescreen.json" },
  { name: "Tiny Dance", file: "tiny_dance.json", bg: "#f5eafe", status: "published", views: "6.1K", size: "34 KB", path: "../assets/Pets/Sagittarius/512/states_2/nhay.json" },
  { name: "Morning Hello", file: "morning_hello.json", bg: "#fff1ef", status: "published", views: "2.7K", size: "44 KB", path: "../assets/Pets/Aquarius/512/homescreen.json" },
  { name: "Magic Unbox", file: "magic_unbox.json", bg: "#e7f5ff", status: "draft", views: "—", size: "63 KB", path: "../assets/Pets/Aries/512/gacha.json" },
  { name: "Cheerful Spin", file: "cheerful_spin.json", bg: "#f1f8e7", status: "published", views: "1.8K", size: "41 KB", path: "../assets/Pets/Gemini/512/states_2/happy_4.json" },
  { name: "Soft Sulk", file: "soft_sulk.json", bg: "#f3f0ef", status: "draft", views: "—", size: "36 KB", path: "../assets/Pets/Capricorn/512/stages_1/A1.json" }
];

let cardPlayers = [], editorPlayer, currentFilter = "all", isPlaying = true, isPublished = false;
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function safePlayer(container, options = {}) {
  if (!window.lottie || !container) return null;
  try {
    const cleanOptions = options.animationData
      ? { ...options, animationData: JSON.parse(JSON.stringify(options.animationData)) }
      : options;
    return lottie.loadAnimation({ container, renderer: "svg", loop: true, autoplay: true, ...cleanOptions });
  } catch { return null; }
}

function renderCards() {
  cardPlayers.forEach(player => player?.destroy()); cardPlayers = [];
  const query = $("#searchInput").value.trim().toLowerCase();
  const filtered = animations.filter(item => (currentFilter === "all" || item.status === currentFilter) && item.name.toLowerCase().includes(query));
  $("#animationGrid").innerHTML = filtered.map((item, index) => `
    <article class="animation-card" data-name="${item.name}">
      <div class="card-preview" style="--card-bg:${item.bg}"><span class="type-badge">LOTTIE JSON</span><div class="lottie-slot" id="cardLottie${index}"></div><div class="card-actions"><button class="preview-toggle" title="Tạm dừng">❚❚</button><button class="edit-card" title="Chỉnh sửa">✎</button></div></div>
      <div class="card-info"><div class="card-title"><h3>${item.name}</h3><button>•••</button></div><p>${item.file}</p><div class="card-meta"><span>${item.size}</span><span>◉ ${item.views}</span><span class="publish-state ${item.status}"><i></i>${item.status === "published" ? "Trên App" : "Bản nháp"}</span></div></div>
    </article>`).join("");
  $("#emptyState").style.display = filtered.length ? "none" : "block";
  filtered.forEach((item, index) => cardPlayers.push(safePlayer($(`#cardLottie${index}`), { path: item.path })));
  $$(".edit-card").forEach((button, index) => button.addEventListener("click", () => openEditor(filtered[index])));
  $$(".preview-toggle").forEach((button, index) => button.addEventListener("click", () => { const player = cardPlayers[index]; if (!player) return; if (button.textContent === "❚❚") { player.pause(); button.textContent = "▶"; } else { player.play(); button.textContent = "❚❚"; } }));
}

function updateLineNumbers() { const lines = $("#jsonEditor").value.split("\n").length; $("#lineNumbers").textContent = Array.from({ length: lines }, (_, i) => i + 1).join("\n"); }
function updateEditorMeta(data) {
  const raw = $("#jsonEditor").value; const kb = (new Blob([raw]).size / 1024).toFixed(1);
  $("#dimensions").textContent = `${data.w || "—"} × ${data.h || "—"}`; $("#frameRate").textContent = `${data.fr || "—"} FPS`; $("#fileSize").textContent = `${kb} KB`; $("#jsonMeta").textContent = `${raw.split("\n").length} dòng · ${kb} KB`;
  $("#durationLabel").textContent = `00:${String(Math.round(((data.op || 0) - (data.ip || 0)) / (data.fr || 1))).padStart(2, "0")}`;
}
function validateAndPreview(showToast = false) {
  try {
    const data = JSON.parse($("#jsonEditor").value); if (!data.v || !data.layers) throw new Error("Thiếu trường v hoặc layers");
    editorPlayer?.destroy(); editorPlayer = safePlayer($("#editorLottie"), { animationData: data }); updateEditorMeta(data);
    $("#validationText").textContent = "JSON hợp lệ và sẵn sàng xuất bản"; $(".editor-footer p i").style.background = "#12a878"; $("#saveStatus").textContent = "Đã lưu";
    if (showToast) showToastMessage("JSON hợp lệ", "Preview đã được cập nhật thành công."); return data;
  } catch (error) { $("#validationText").textContent = `Lỗi: ${error.message}`; $(".editor-footer p i").style.background = "#ff5267"; $("#saveStatus").textContent = "Có lỗi"; return null; }
}
async function openEditor(item) {
  $("#editorModal").classList.add("open"); $("#editorModal").setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden";
  $("#editorFile").textContent = item?.file || "happy_loop.json";
  let editorData = sampleJson;
  try {
    const response = await fetch(item?.path || "../assets/Pets/Libra/512/states_2/happy_3.json");
    if (response.ok) editorData = await response.json();
  } catch { /* Giữ animation mẫu khi chạy offline. */ }
  $("#jsonEditor").value = JSON.stringify(editorData, null, 2); updateLineNumbers(); validateAndPreview();
}
function closeEditor() { $("#editorModal").classList.remove("open"); $("#editorModal").setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; editorPlayer?.destroy(); }
function showToastMessage(title, detail) { $("#toast b").textContent = title; $("#toast small").textContent = detail; $("#toast").classList.add("show"); setTimeout(() => $("#toast").classList.remove("show"), 3200); }

window.addEventListener("load", () => {
  safePlayer($("#heroLottie"), { path: "../assets/Pets/Libra/512/states_2/happy_3.json" }); renderCards();
  $$('[data-open-editor]').forEach(button => button.addEventListener("click", () => openEditor()));
  $$(".close-editor, .cancel-editor").forEach(button => button.addEventListener("click", closeEditor));
  $("#editorModal").addEventListener("click", event => { if (event.target === $("#editorModal")) closeEditor(); });
  $("#jsonEditor").addEventListener("input", () => { updateLineNumbers(); $("#saveStatus").textContent = "Chưa lưu"; clearTimeout(window.previewTimer); window.previewTimer = setTimeout(() => validateAndPreview(), 650); });
  $("#jsonEditor").addEventListener("scroll", event => $("#lineNumbers").scrollTop = event.target.scrollTop);
  $("#formatJson").addEventListener("click", () => { try { $("#jsonEditor").value = JSON.stringify(JSON.parse($("#jsonEditor").value), null, 2); updateLineNumbers(); validateAndPreview(true); } catch { validateAndPreview(); } });
  $("#validateJson").addEventListener("click", () => validateAndPreview(true));
  $("#speedSelect").addEventListener("change", event => editorPlayer?.setSpeed(Number(event.target.value)));
  $("#playToggle").addEventListener("click", () => { if (!editorPlayer) return; isPlaying ? editorPlayer.pause() : editorPlayer.play(); isPlaying = !isPlaying; $("#playToggle").textContent = isPlaying ? "❚❚" : "▶"; });
  $("#loopToggle").addEventListener("click", event => { if (!editorPlayer) return; editorPlayer.loop = !editorPlayer.loop; event.currentTarget.classList.toggle("active", editorPlayer.loop); });
  $("#bgToggle").addEventListener("click", () => $(".preview-canvas").classList.toggle("dark"));
  $("#timelineRange").addEventListener("input", event => editorPlayer?.goToAndStop((Number(event.target.value) / 100) * (editorPlayer.totalFrames || 0), true));
  setInterval(() => { if (editorPlayer && isPlaying) { const progress = (editorPlayer.currentFrame / editorPlayer.totalFrames) * 100; $("#timelineRange").value = progress || 0; $("#currentFrame").textContent = `00:${String(Math.floor((editorPlayer.currentFrame || 0) / (editorPlayer.frameRate || 60))).padStart(2, "0")}`; } }, 100);
  $("#downloadJson").addEventListener("click", () => { const blob = new Blob([$("#jsonEditor").value], { type: "application/json" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = $("#editorFile").textContent; link.click(); URL.revokeObjectURL(link.href); });
  $(".save-draft").addEventListener("click", () => { if (validateAndPreview()) { $("#saveStatus").textContent = "Đã lưu"; showToastMessage("Đã lưu bản nháp", "Các thay đổi đã được lưu vào workspace."); } });
  $("#publishButton").addEventListener("click", () => { if (!validateAndPreview()) return; if (!isPublished) { isPublished = true; $("#publishedCount").textContent = "25"; } closeEditor(); showToastMessage("Đã xuất bản lên App", "Animation sẽ xuất hiện trong cửa hàng sau vài giây."); });
  $("#searchInput").addEventListener("input", renderCards);
  $$("#filterChips button").forEach(button => button.addEventListener("click", () => { $$("#filterChips button").forEach(item => item.classList.remove("active")); button.classList.add("active"); currentFilter = button.dataset.filter; renderCards(); }));
  $("#watchFlow").addEventListener("click", () => $("#app-store").scrollIntoView({ behavior: "smooth", block: "center" }));
  $(".mobile-menu").addEventListener("click", () => $(".sidebar").classList.toggle("open"));
  document.addEventListener("keydown", event => { if (event.key === "Escape" && $("#editorModal").classList.contains("open")) closeEditor(); });
});
