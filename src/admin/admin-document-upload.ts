import { upload } from "@vercel/blob/client";

async function sha256(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function canonicalFileType(file: File): {
  mimeType: string;
  extension: ".pdf" | ".docx";
} {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".pdf")) {
    return { mimeType: "application/pdf", extension: ".pdf" };
  }
  if (lowerName.endsWith(".docx")) {
    return {
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      extension: ".docx",
    };
  }
  throw new Error("Разрешены только файлы PDF и DOCX.");
}

async function assertFileSignature(file: File, extension: ".pdf" | ".docx") {
  const bytes = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  const pdf =
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d;
  const zip =
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04;
  if ((extension === ".pdf" && !pdf) || (extension === ".docx" && !zip)) {
    throw new Error("Содержимое файла не соответствует его расширению.");
  }
}

export async function uploadAdminDocumentFile(
  documentId: string,
  file: File,
): Promise<void> {
  if (file.size <= 0 || file.size > 25_000_000) {
    throw new Error("Размер файла должен быть не больше 25 МБ.");
  }
  const { mimeType, extension } = canonicalFileType(file);
  await assertFileSignature(file, extension);
  const hash = await sha256(file);
  await upload(`normative/${documentId}/${hash}${extension}`, file, {
    access: "public",
    handleUploadUrl: "/api/admin/document-upload",
    multipart: file.size > 4_000_000,
    clientPayload: JSON.stringify({
      documentId,
      originalFilename: file.name,
      mimeType,
      sizeBytes: file.size,
      sha256: hash,
    }),
  });
}
