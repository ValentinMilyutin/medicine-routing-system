import { describe, expect, it } from "vitest";
import {
  OperationsInputError,
  operationsStoreTestUtils,
} from "../../api/_lib/operations-store";

describe("операционный контур", () => {
  it("преобразует карточку нормативного документа и её привязки", () => {
    const document = operationsStoreTestUtils.documentFromRow({
      id: 7,
      code: "NOV-MZ-1360-D-2023",
      title: "Приказ о маршрутизации пострадавших при ДТП",
      issuer: "Министерство здравоохранения Новгородской области",
      document_number: "1360-Д",
      issued_on: "2023-11-21",
      status: "active",
      official_url: null,
      storage_provider: "vercel_blob",
      storage_key: "normative/7/hash.pdf",
      file_url: "https://example.public.blob.vercel-storage.com/order.pdf",
      download_url: "https://example.public.blob.vercel-storage.com/order.pdf?download=1",
      original_filename: "ДТП.pdf",
      mime_type: "application/pdf",
      size_bytes: "6211166",
      sha256: "2e2ead54a1359f7f77795b935e52d905d3bf749a6cc66cabe7f94fb625f423f8",
      notes: "Предоставленная копия",
      verified_at: "2026-08-24T12:00:00.000Z",
      created_at: "2026-08-24T12:00:00.000Z",
      updated_at: "2026-08-24T12:00:00.000Z",
      references: [
        {
          id: "11",
          profileId: "road_accident",
          sourceId: "novgorod-1360-d",
          branchId: null,
          referenceLabel: "Основной приказ",
        },
      ],
    });

    expect(document).toMatchObject({
      id: "7",
      code: "NOV-MZ-1360-D-2023",
      sizeBytes: 6211166,
      references: [
        {
          id: "11",
          profileId: "road_accident",
          sourceId: "novgorod-1360-d",
        },
      ],
    });
  });

  it("не принимает произвольный профиль в обратную связь и статистику", () => {
    expect(() => operationsStoreTestUtils.profileId("unknown-profile"))
      .toThrow(OperationsInputError);
    expect(operationsStoreTestUtils.profileId(null, true)).toBeNull();
  });

  it("преобразует обращение без персональных реквизитов", () => {
    const feedback = operationsStoreTestUtils.feedbackFromRow({
      id: 15,
      category: "routing_error",
      message: "Проверьте адрес принимающей организации",
      profile_id: "infectious",
      content_version: "0.4.0",
      result_id: "Инфекционный стационар",
      rule_id: "infectious-admission",
      status: "new",
      admin_note: "",
      notification_status: "not_configured",
      notification_error: null,
      created_at: "2026-08-24T12:00:00.000Z",
      updated_at: "2026-08-24T12:00:00.000Z",
    });

    expect(feedback).toMatchObject({
      id: "15",
      profileId: "infectious",
      status: "new",
      notificationStatus: "not_configured",
    });
    expect(feedback).not.toHaveProperty("patientName");
    expect(feedback).not.toHaveProperty("ipAddress");
  });
});
