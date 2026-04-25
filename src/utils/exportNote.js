import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
} from "docx";

function formatDateTime(ms) {
  if (!ms) return "Không có";
  const d = new Date(ms);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

function escapeHtml(text = "") {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildNoteHtml(note) {
  const tags = Array.isArray(note?.tags) ? note.tags : [];
  const images = Array.isArray(note?.images) ? note.images : [];
  const audios = Array.isArray(note?.audios) ? note.audios : [];

  const imageHtml = images
    .map((img) => {
      const uri = img?.dataUrl || img?.url || "";
      if (!uri) return "";
      return `
        <div class="image-box">
          <img src="${uri}" />
        </div>
      `;
    })
    .join("");

  const audioHtml = audios.length
    ? `
      <div class="section">
        <h3>🎧 Ghi âm</h3>
        ${audios
          .map((a, idx) => {
            const uri = a?.dataUrl || a?.url || "";
            if (!uri) return "";
            return `
              <div class="audio-box">
                <div>Ghi âm ${idx + 1}</div>
                <audio controls src="${uri}"></audio>
              </div>
            `;
          })
          .join("")}
      </div>
    `
    : "";

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body {
            font-family: Arial, sans-serif;
            background: #f5f5f5;
            padding: 20px;
          }

          .card {
            background: ${
                note?.color === "yellow"
                ? "#fffbe6"
                : note?.color === "blue"
                ? "#eef4ff"
                : note?.color === "green"
                ? "#eefbf3"
                : note?.color === "pink"
                ? "#fff1f7"
                : "#ffffff"
            };
            padding: 20px;
            border-radius: 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            }

          h1 {
            margin-bottom: 8px;
          }

          .meta {
            color: #666;
            font-size: 13px;
            margin-bottom: 4px;
          }

          .section {
            margin-top: 16px;
          }

          .tags {
            margin-top: 6px;
          }

          .tag {
            display: inline-block;
            padding: 6px 10px;
            margin-right: 6px;
            margin-bottom: 6px;
            border-radius: 999px;
            background: #eee;
            font-size: 12px;
          }

          .content {
            margin-top: 8px;
            line-height: 1.6;
            white-space: pre-wrap;
          }

          .image-box {
            margin-top: 12px;
          }

          .image-box img {
            width: 100%;
            max-height: 300px;
            object-fit: contain;
            border-radius: 12px;
            border: 1px solid #eee;
          }

          .audio-box {
            margin-top: 10px;
            padding: 10px;
            border-radius: 10px;
            background: #fafafa;
            border: 1px solid #eee;
          }

          audio {
            width: 100%;
            margin-top: 6px;
          }
        </style>
      </head>

      <body>
        <div class="card">
        <h2 style="margin:0 0 8px 0; color:#111; font-size:18px;">HVT Note</h2>
        <h1>${note?.title || "Không tiêu đề"}</h1>

          <div class="meta"><b>Folder:</b> ${note?.folder || "Không có"}</div>
            <div class="meta"><b>Ngày tạo:</b> ${
            note?.createdAt ? new Date(note.createdAt).toLocaleString() : "Không có"
            }</div>
            <div class="meta"><b>Nhắc nhở:</b> ${
            note?.reminderAt ? new Date(note.reminderAt).toLocaleString() : "Không có"
            }</div>
            <div class="meta"><b>Lặp lại:</b> ${note?.reminderRepeat || "none"}</div>
            <div class="meta"><b>Cập nhật:</b> ${
            note?.updatedAt ? new Date(note.updatedAt).toLocaleString() : "Không có"
            }</div>

          <div class="section">
            <b>Tags:</b>
            <div class="tags">
              ${
                tags.length
                  ? tags.map((t) => `<span class="tag">#${t}</span>`).join("")
                  : "Không có"
              }
            </div>
          </div>

          <div class="section">
            <b>Nội dung:</b>
            <div class="content">${note?.content || ""}</div>
          </div>

          ${imageHtml}
          ${audioHtml}
        </div>
      </body>
    </html>
  `;
}

export async function exportNoteToPdf(note) {
  const html = buildNoteHtml(note);

  const result = await Print.printToFileAsync({
    html,
  });

  const safeTitle = (note?.title || "note")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 40);

  const targetUri = `${FileSystem.documentDirectory}${safeTitle}_${Date.now()}.pdf`;

  await FileSystem.copyAsync({
    from: result.uri,
    to: targetUri,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(targetUri);
  } else {
    return targetUri;
  }
}

export async function exportNoteToDocx(note) {
  const tags = Array.isArray(note?.tags) ? note.tags : [];
  const images = Array.isArray(note?.images) ? note.images : [];
  const audios = Array.isArray(note?.audios) ? note.audios : [];

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: note?.title || "Không tiêu đề",
            heading: HeadingLevel.HEADING_1,
          }),

          new Paragraph({
            children: [
              new TextRun({ text: "Folder: ", bold: true }),
              new TextRun(note?.folder || "Không có"),
            ],
          }),

          new Paragraph({
            children: [
              new TextRun({ text: "Tags: ", bold: true }),
              new TextRun(tags.length ? tags.map((t) => `#${t}`).join(", ") : "Không có"),
            ],
          }),

          new Paragraph({
            children: [
              new TextRun({ text: "Nhắc nhở: ", bold: true }),
              new TextRun(note?.reminderAt ? formatDateTime(note.reminderAt) : "Không có"),
            ],
          }),

          new Paragraph({
            children: [
              new TextRun({ text: "Lặp lại: ", bold: true }),
              new TextRun(note?.reminderRepeat || "none"),
            ],
          }),

          new Paragraph(""),
          new Paragraph({
            children: [new TextRun({ text: "Nội dung", bold: true })],
          }),
          new Paragraph(note?.content || ""),

          new Paragraph(""),
          new Paragraph({
            children: [new TextRun({ text: `Số ảnh: ${images.length}`, bold: true })],
          }),
          new Paragraph({
            children: [new TextRun({ text: `Số ghi âm: ${audios.length}`, bold: true })],
          }),
        ],
      },
    ],
  });

  const base64 = await Packer.toBase64String(doc);

  const safeTitle = (note?.title || "note")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 40);

  const fileUri = `${FileSystem.documentDirectory}${safeTitle}_${Date.now()}.docx`;

  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      dialogTitle: "Chia sẻ file DOCX",
      UTI: "org.openxmlformats.wordprocessingml.document",
    });
  } else {
    return fileUri;
  }
}